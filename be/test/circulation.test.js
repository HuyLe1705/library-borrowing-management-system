const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const database = require('../src/config/database');

// Exercise repository guards and transaction boundaries without a live SQL Server.
let queryHandler;
let queries = [];
let committed = 0;
let rolledBack = 0;
class Request {
    constructor() { this.params = {}; }
    input(name, type, value) { this.params[name] = value; return this; }
    async query(sql) {
        queries.push({ sql, params: { ...this.params } });
        return queryHandler(sql, this.params);
    }
}
class Transaction {
    async begin() {}
    async commit() { committed++; }
    async rollback() { rolledBack++; }
}
database.getPool = async () => ({ request: () => new Request() });
database.sql.Request = Request;
database.sql.Transaction = Transaction;

const app = require('../src/app');
const reservations = require('../src/repositories/reservation.repository');
const borrowRequests = require('../src/repositories/borrowRequest.repository');
const renewals = require('../src/repositories/renewalRequest.repository');
const fines = require('../src/repositories/fine.repository');
const borrows = require('../src/repositories/borrow.repository');
const logs = require('../src/services/activityLog.service');
const staff = { id: 2, userCode: 'TT001', role: 'LIBRARIAN' };
const reader = { id: 3, userCode: 'SV001', role: 'STUDENT' };
const headers = user => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${jwt.sign(user, process.env.JWT_SECRET || 'lbms_default_jwt_secret_key_2026')}` });
const rows = (...recordset) => ({ recordset });
let server, url;
before(async () => {
    logs.log = async () => null;
    server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
    queries = []; committed = 0; rolledBack = 0;
    queryHandler = sql => { throw new Error(`Unexpected SQL: ${sql}`); };
});

test('approve endpoint works without body, enforces APPROVED, and rejects readers', async t => {
    t.mock.method(borrowRequests, 'findById', async () => ({ id: 1, status: 'PENDING' }));
    t.mock.method(reservations, 'transition', async (id, payload, user) => {
        assert.equal(id, 1); assert.equal(payload.status, 'APPROVED'); assert.equal(user.id, staff.id);
        return { id, status: payload.status, copyId: 7 };
    });
    const result = await fetch(`${url}/borrow-requests/1/approve`, { method: 'PATCH', headers: headers(staff) });
    assert.equal(result.status, 200); assert.equal((await result.json()).data.copyId, 7);
    const denied = await fetch(`${url}/borrow-requests/1/approve`, { method: 'PATCH', headers: headers(reader) });
    assert.equal(denied.status, 403);
    t.mock.restoreAll();
});

test('reject and fulfill aliases select the correct transitions', async t => {
    t.mock.method(borrowRequests, 'findById', async () => ({ id: 1 }));
    const seen = [];
    t.mock.method(reservations, 'transition', async (id, payload) => { seen.push(payload.status); return { id, status: payload.status }; });
    for (const action of ['reject','fulfill']) {
        const result = await fetch(`${url}/borrow-requests/1/${action}`, { method:'PATCH', headers:headers(staff) });
        assert.equal(result.status,200);
    }
    assert.deepEqual(seen,['REJECTED','FULFILLED']); t.mock.restoreAll();
});

test('all new APIs require authentication; reader cannot approve renewals or receive fine payments', async () => {
    for (const path of ['renewal-requests','fines']) assert.equal((await fetch(`${url}/${path}`)).status,401);
    for (const path of ['renewal-requests/1/approve','renewal-requests/1/reject','fines/1/pay']) {
        assert.equal((await fetch(`${url}/${path}`, { method:'PATCH', headers:headers(reader) })).status,403);
    }
    assert.equal((await fetch(`${url}/fines`,{ method:'POST',headers:headers(reader),body:'{}' })).status,403);
});

test('renewal requests validate IDs and notes before repository access', async () => {
    for (const body of [{ borrowRecordId:0 },{ borrowRecordId:1.5 },{ borrowRecordId:1,note:'x'.repeat(501) }]) {
        const response = await fetch(`${url}/renewal-requests`, { method:'POST',headers:headers(reader),body:JSON.stringify(body) });
        assert.equal(response.status,400);
    }
    assert.equal(queries.length,0);
});

test('renewal and fine lists ignore supplied identity filters for a reader', async () => {
    queryHandler = (sql,params) => {
        assert.equal(params.readerId,reader.id); assert.equal(params.userCode,null); return rows();
    };
    for (const path of ['renewal-requests','fines']) {
        const response = await fetch(`${url}/${path}?userCode=OTHER&userId=999`,{ headers:headers(reader) });
        assert.equal(response.status,200); assert.deepEqual((await response.json()).data,[]);
    }
});

function reservationQueries({ status='PENDING', available=true, debt=0, expired=false } = {}) {
    return (sql,params) => {
        if (sql.includes('SELECT * FROM dbo.borrow_requests')) return rows({ id:1,status,user_id:reader.id,book_id:4,copy_id:7 });
        if (sql.includes('SELECT * FROM dbo.users')) return rows({ role:'STUDENT',status:'ACTIVE' });
        if (sql.includes('AS activeCount')) return { recordsets:[[{ activeCount:0,overdue:0 }],[{ unpaid:debt }],[{ duplicate:0 }]] };
        if (sql.includes('SELECT TOP 1 bc.id')) return available ? rows({ id:7 }) : rows();
        if (sql.includes('AS invalid')) return rows();
        if (sql.includes('pickup_deadline<')) return expired ? rows({ id:1 }) : rows();
        if (sql.includes('OUTPUT INSERTED.id')) return rows({ id:1,status:params.status,copyId:7 });
        return rows();
    };
}

test('approval selects a free copy and commits the reservation without starting a loan', async () => {
    queryHandler = reservationQueries();
    const result = await reservations.transition(1,{ status:'APPROVED' },staff);
    assert.equal(result.copyId,7); assert.equal(committed,1); assert.equal(rolledBack,0);
    assert.ok(queries.some(q => q.params.selectedCopy === 7));
    assert.ok(queries.some(q => q.sql.includes("r.status='APPROVED' AND r.id<>@id")));
    assert.ok(!queries.some(q => q.sql.includes('INSERT INTO dbo.borrow_records')));
});

test('no free copy, ineligible borrower, and repeated approval roll back', async () => {
    for (const [options,statusCode] of [[{ available:false },409],[{ debt:1 },403],[{ status:'APPROVED' },409]]) {
        queryHandler=reservationQueries(options);
        await assert.rejects(reservations.transition(1,{ status:'APPROVED' },staff),error => error.statusCode === statusCode);
    }
    assert.equal(committed,0); assert.equal(rolledBack,3);
});

test('handover creates the loan and changes request status in one transaction', async () => {
    queryHandler=reservationQueries({ status:'APPROVED' });
    await reservations.transition(1,{ status:'FULFILLED' },staff);
    assert.ok(queries.some(q => q.sql.includes('INSERT INTO dbo.borrow_records') && q.params.days === 14));
    assert.equal(committed,1);
});

test('expired handover does not create a loan', async () => {
    queryHandler=reservationQueries({ status:'APPROVED',expired:true });
    await assert.rejects(reservations.transition(1,{ status:'FULFILLED' },staff),error => error.statusCode === 409);
    assert.ok(!queries.some(q => q.sql.includes('INSERT INTO dbo.borrow_records'))); assert.equal(rolledBack,1);
});

function renewalQueries({ owner=reader.id, status='BORROWED', renewalCount=0, overdue=0, debt=0, reserved=0, pending=false, decisionStatus='PENDING' } = {}) {
    return (sql,params) => {
        if (sql.includes('SELECT r.*, br.borrower_id')) return rows({ id:1,borrow_record_id:9,borrower_id:owner,status:decisionStatus });
        if (sql.includes('SELECT br.*, u.status')) return rows({ id:9,borrower_id:owner,copy_id:7,status,renewal_count:renewalCount,readerStatus:'ACTIVE' });
        if (sql.includes('AS reserved')) return rows({ overdue,debt,reserved });
        if (sql.includes('SELECT id FROM dbo.renewal_requests')) return pending ? rows({ id:1 }) : rows();
        if (sql.includes('INSERT INTO dbo.renewal_requests')) return rows({ id:1,status:'PENDING' });
        if (sql.includes('UPDATE r SET')) return rows({ id:1,status:params.status,newDueDate:'2026-12-01' });
        return rows();
    };
}

test('reader submits an eligible renewal without changing due date', async () => {
    queryHandler=renewalQueries();
    assert.equal((await renewals.create(9,'Need more time',reader)).status,'PENDING');
    assert.ok(!queries.some(q => q.sql.includes('UPDATE dbo.borrow_records'))); assert.equal(committed,1);
});

test('renewal guards cover wrong owner, returned loan, renewal limit, overdue, debt, reservations and duplicates', async () => {
    for (const [options,code] of [[{ owner:99 },403],[{ status:'RETURNED' },409],[{ renewalCount:1 },409],[{ overdue:1 },403],[{ debt:1 },403],[{ reserved:1 },409],[{ pending:true },409]]) {
        queryHandler=renewalQueries(options);
        await assert.rejects(renewals.create(9,null,reader),error => error.statusCode === code);
    }
    assert.equal(committed,0); assert.equal(rolledBack,7);
});

test('approval rechecks eligibility, extends by seven days, and increments renewal count', async () => {
    queryHandler=renewalQueries();
    assert.equal((await renewals.decide(1,'APPROVED',null,staff)).newDueDate,'2026-12-01');
    assert.ok(queries.some(q => q.sql.includes('DATEADD(DAY,7,due_date)') && q.sql.includes('renewal_count=renewal_count+1')));
    assert.equal(committed,1);
});

test('renewal approval fails if borrower becomes ineligible after submission', async () => {
    queryHandler=renewalQueries({ debt:1 });
    await assert.rejects(renewals.decide(1,'APPROVED',null,staff),error => error.statusCode === 403);
    assert.ok(!queries.some(q => q.sql.includes('UPDATE dbo.borrow_records'))); assert.equal(rolledBack,1);
});

test('reject does not extend loan; repeated decisions and cancelling another reader request fail', async () => {
    queryHandler=renewalQueries();
    await renewals.decide(1,'REJECTED','Not available',staff);
    assert.ok(!queries.some(q => q.sql.includes('UPDATE dbo.borrow_records')));
    queryHandler=renewalQueries({ decisionStatus:'APPROVED' });
    await assert.rejects(renewals.decide(1,'REJECTED',null,staff),error => error.statusCode === 409);
    queryHandler=renewalQueries({ owner:99 });
    await assert.rejects(renewals.decide(1,'CANCELLED',null,reader),error => error.statusCode === 403);
});

test('fine amount is computed from stored overdue days; client cannot choose amount', async () => {
    queryHandler=(sql,params) => {
        if (sql.includes('DATEDIFF')) return rows({ status:'RETURNED',return_date:'2026-11-12',overdueDays:3,borrower_id:reader.id });
        if (sql.includes('SELECT id FROM dbo.fines')) return rows();
        if (sql.includes('INSERT INTO dbo.fines')) { assert.equal(params.amount,15000); return rows({ id:1,amount:params.amount,status:'UNPAID' }); }
        return rows();
    };
    const response=await fetch(`${url}/fines`,{ method:'POST',headers:headers(staff),body:JSON.stringify({ borrowRecordId:9,amount:1,overdueDays:999 }) });
    assert.equal(response.status,201); assert.equal((await response.json()).data.amount,15000); assert.equal(committed,1);
});

test('fine creation rejects unreturned loans and duplicate fines', async () => {
    queryHandler=sql => sql.includes('DATEDIFF') ? rows({ status:'BORROWED',return_date:null,overdueDays:3 }) : rows();
    await assert.rejects(fines.create(9,null,staff),error => error.statusCode === 400);
    queryHandler=sql => sql.includes('DATEDIFF') ? rows({ status:'RETURNED',return_date:'2026-11-12',overdueDays:3 }) : rows({ id:1 });
    await assert.rejects(fines.create(9,null,staff),error => error.statusCode === 409);
    assert.equal(committed,0);
});

test('pay fine rejects duplicate payment without issuing another update', async () => {
    queryHandler=() => rows({ id:1,status:'PAID',borrowerId:reader.id });
    await assert.rejects(borrows.payFine(1),error => error.statusCode === 400);
    assert.equal(committed,0); assert.equal(rolledBack,1); assert.equal(queries.length,1);
});

test('successful fine payment checks all debt and overdue books before unlocking', async () => {
    queryHandler=sql => sql.includes('SELECT f.id') ? rows({ id:1,status:'UNPAID',borrowerId:reader.id }) : rows();
    assert.equal((await borrows.payFine(1)).status,'PAID');
    const update=queries.find(q => q.sql.includes("SET status = 'PAID'"));
    assert.ok(update.sql.includes("f2.status = 'UNPAID'"));
    assert.ok(update.sql.includes("br3.status = 'OVERDUE'")); assert.equal(committed,1);
});

test('direct checkout cannot borrow a copy held for an approved reservation', async () => {
    queryHandler=sql => {
        if (sql.includes('FROM dbo.users WITH')) return rows({ id:reader.id,role:'STUDENT',status:'ACTIVE' });
        if (sql.includes('AS activeCount')) return { recordsets:[[{ activeCount:0,overdueCount:0 }],[{ unpaidFines:0 }]] };
        if (sql.includes('FROM dbo.book_copies WITH')) return rows({ id:7,book_id:4,status:'AVAILABLE' });
        if (sql.includes('FROM dbo.borrow_requests WITH')) return rows({ id:1 });
        throw new Error('Unexpected checkout query');
    };
    await assert.rejects(borrows.createBorrow({ userCode:reader.userCode,barcode:'BC001',librarianCode:staff.userCode }),error => error.statusCode === 409);
    assert.equal(committed,0); assert.equal(rolledBack,1);
});

test('return automatically creates overdue fine and cancels pending renewal in the transaction', async () => {
    queryHandler=(sql,params) => {
        if (sql.includes('br.id AS borrowId')) return rows({ borrowId:9,copyId:7,borrowerId:reader.id,overdueDays:2 });
        if (sql.includes('SELECT id FROM dbo.users')) return rows({ id:staff.id });
        if (sql.includes('INSERT INTO dbo.fines')) { assert.equal(params.amount,10000); return rows({ fineId:1,amount:params.amount,status:'UNPAID' }); }
        return rows();
    };
    const result=await borrows.returnBook({ barcode:'BC001',librarianCode:staff.userCode });
    assert.equal(result.fine.amount,10000); assert.equal(result.status,'RETURNED');
    assert.ok(queries.some(q => q.sql.includes("UPDATE dbo.renewal_requests SET status='CANCELLED'")));
    assert.equal(committed,1);
});

test('pending renewal can be cancelled by its owner without extending the loan', async () => {
    queryHandler=renewalQueries();
    assert.equal((await renewals.decide(1,'CANCELLED',null,reader)).status,'CANCELLED');
    assert.ok(!queries.some(q => q.sql.includes('UPDATE dbo.borrow_records')));
    assert.equal(committed,1);
});
