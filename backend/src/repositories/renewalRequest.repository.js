const { getPool, sql } = require('../config/database');
const transaction = require('../utils/transaction');
const HttpError = require('../utils/httpError');
const { staff } = require('../utils/validation');

async function eligible(req, borrowId, user) {
    req.input('borrowId', sql.Int, borrowId);
    const record = (await req.query(`SELECT br.*, u.status AS readerStatus FROM dbo.borrow_records br WITH (UPDLOCK,HOLDLOCK)
        JOIN dbo.users u WITH (UPDLOCK) ON u.id=br.borrower_id WHERE br.id=@borrowId`)).recordset[0];
    if (!record) throw new HttpError(404, 'Không tìm thấy phiếu mượn.');
    if (!staff(user) && record.borrower_id !== user.id) throw new HttpError(403, 'Bạn chỉ được gia hạn phiếu mượn của mình.');
    req.input('readerId', sql.Int, record.borrower_id).input('copyId', sql.Int, record.copy_id);
    const check = (await req.query(`SELECT
        CASE WHEN EXISTS(SELECT 1 FROM dbo.borrow_records WHERE borrower_id=@readerId AND
            (status='OVERDUE' OR (status='BORROWED' AND due_date<CAST(SYSDATETIME() AS DATE)))) THEN 1 ELSE 0 END AS overdue,
        CASE WHEN EXISTS(SELECT 1 FROM dbo.fines f JOIN dbo.borrow_records br ON br.id=f.borrow_record_id
            WHERE br.borrower_id=@readerId AND f.status='UNPAID') THEN 1 ELSE 0 END AS debt,
        CASE WHEN EXISTS(SELECT 1 FROM dbo.borrow_requests r JOIN dbo.book_copies bc ON bc.book_id=r.book_id
            WHERE bc.id=@copyId AND r.user_id<>@readerId AND r.status IN ('PENDING','APPROVED')) THEN 1 ELSE 0 END AS reserved
    `)).recordset[0];
    if (record.readerStatus !== 'ACTIVE' || check.overdue || check.debt) throw new HttpError(403, 'Không thể gia hạn khi bị khóa, có sách quá hạn hoặc nợ phạt.');
    if (record.status !== 'BORROWED' || record.renewal_count >= 1) throw new HttpError(409, 'Chỉ được gia hạn một lần cho sách đang mượn chưa quá hạn.');
    if (check.reserved) throw new HttpError(409, 'Đầu sách đang có độc giả khác chờ mượn.');
    return record;
}

module.exports = {
    async list(query, user) {
        const pool = await getPool();
        const req = pool.request().input('readerId', sql.Int, staff(user) ? null : user.id)
            .input('userCode', sql.VarChar(20), staff(user) ? query.userCode || null : null)
            .input('status', sql.VarChar(20), query.status || null);
        return (await req.query(`SELECT r.id, r.borrow_record_id AS borrowRecordId, r.status, r.note, r.admin_note AS adminNote,
            r.original_due_date AS originalDueDate, r.new_due_date AS newDueDate, r.created_at AS createdAt, r.reviewed_at AS reviewedAt,
            br.borrower_id AS borrowerId, u.user_code AS borrowerCode, u.full_name AS borrowerName,
            b.title AS bookTitle, bc.barcode
            FROM dbo.renewal_requests r JOIN dbo.borrow_records br ON br.id=r.borrow_record_id
            JOIN dbo.users u ON u.id=br.borrower_id JOIN dbo.book_copies bc ON bc.id=br.copy_id JOIN dbo.books b ON b.id=bc.book_id
            WHERE (@readerId IS NULL OR br.borrower_id=@readerId) AND (@userCode IS NULL OR u.user_code=@userCode)
            AND (@status IS NULL OR r.status=@status) ORDER BY r.created_at DESC, r.id DESC`)).recordset;
    },
    create(borrowId, note, user) {
        return transaction(async (request) => {
            const req = request();
            await eligible(req, borrowId, user);
            const existing = (await req.query(`SELECT id FROM dbo.renewal_requests WITH (UPDLOCK,HOLDLOCK) WHERE borrow_record_id=@borrowId AND status='PENDING'`)).recordset[0];
            if (existing) throw new HttpError(409, 'Phiếu mượn đã có yêu cầu gia hạn đang chờ duyệt.');
            req.input('note', sql.NVarChar(500), note);
            return (await req.query(`INSERT INTO dbo.renewal_requests(borrow_record_id,note,original_due_date)
                OUTPUT INSERTED.id, INSERTED.status, INSERTED.original_due_date AS originalDueDate
                SELECT id,@note,due_date FROM dbo.borrow_records WHERE id=@borrowId`)).recordset[0];
        });
    },
    decide(id, status, note, user) {
        return transaction(async (request) => {
            const req = request().input('id', sql.Int, id);
            const record = (await req.query(`SELECT r.*, br.borrower_id FROM dbo.renewal_requests r WITH (UPDLOCK,HOLDLOCK)
                JOIN dbo.borrow_records br ON br.id=r.borrow_record_id WHERE r.id=@id`)).recordset[0];
            if (!record) throw new HttpError(404, 'Không tìm thấy yêu cầu gia hạn.');
            if (status === 'CANCELLED' && !staff(user) && record.borrower_id !== user.id) throw new HttpError(403, 'Không có quyền hủy yêu cầu này.');
            if (record.status !== 'PENDING') throw new HttpError(409, 'Yêu cầu đã được xử lý.');
            if (status === 'APPROVED') {
                await eligible(req, record.borrow_record_id, user);
                await req.query(`UPDATE dbo.borrow_records SET due_date=DATEADD(DAY,7,due_date), renewal_count=renewal_count+1 WHERE id=@borrowId`);
            }
            req.input('status', sql.VarChar(20), status).input('note', sql.NVarChar(500), note).input('staffId', sql.Int, user.id);
            return (await req.query(`UPDATE r SET status=@status,admin_note=@note,reviewed_by=@staffId,reviewed_at=SYSDATETIME(),
                new_due_date=CASE WHEN @status='APPROVED' THEN (SELECT br.due_date FROM dbo.borrow_records br WHERE br.id=r.borrow_record_id) ELSE NULL END
                OUTPUT INSERTED.id,INSERTED.status,INSERTED.new_due_date AS newDueDate FROM dbo.renewal_requests r WHERE r.id=@id`)).recordset[0];
        });
    },
};
