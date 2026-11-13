const { getPool, sql } = require('../config/database');
const transaction = require('../utils/transaction');
const HttpError = require('../utils/httpError');
const { staff } = require('../utils/validation');

module.exports = {
    async list(query, user) {
        const pool = await getPool();
        return (await pool.request().input('readerId', sql.Int, staff(user) ? null : user.id)
            .input('userCode', sql.VarChar(20), staff(user) ? query.userCode || null : null)
            .input('status', sql.VarChar(20), query.status || null)
            .query(`SELECT f.id, f.borrow_record_id AS borrowRecordId, f.overdue_days AS overdueDays, f.amount, f.reason, f.status,
                f.created_at AS createdAt, f.paid_at AS paidAt, u.user_code AS borrowerCode, u.full_name AS borrowerName,
                b.title AS bookTitle, bc.barcode, br.due_date AS dueDate, br.return_date AS returnDate
                FROM dbo.fines f JOIN dbo.borrow_records br ON br.id=f.borrow_record_id JOIN dbo.users u ON u.id=br.borrower_id
                JOIN dbo.book_copies bc ON bc.id=br.copy_id JOIN dbo.books b ON b.id=bc.book_id
                WHERE (@readerId IS NULL OR br.borrower_id=@readerId) AND (@userCode IS NULL OR u.user_code=@userCode)
                AND (@status IS NULL OR f.status=@status) ORDER BY f.created_at DESC,f.id DESC`)).recordset;
    },
    create(borrowId, reason, user) {
        return transaction(async (request) => {
            const req = request().input('borrowId', sql.Int, borrowId).input('staffId', sql.Int, user.id)
                .input('reason', sql.NVarChar(255), reason || 'Trả sách quá hạn');
            const record = (await req.query(`SELECT *, DATEDIFF(DAY,due_date,return_date) AS overdueDays
                FROM dbo.borrow_records WITH (UPDLOCK,HOLDLOCK) WHERE id=@borrowId`)).recordset[0];
            if (!record) throw new HttpError(404, 'Không tìm thấy phiếu mượn.');
            if (record.status !== 'RETURNED' || !record.return_date || record.overdueDays <= 0) throw new HttpError(400, 'Chỉ lập phiếu phạt cho sách đã trả quá hạn.');
            if ((await req.query(`SELECT id FROM dbo.fines WITH (UPDLOCK,HOLDLOCK) WHERE borrow_record_id=@borrowId`)).recordset.length)
                throw new HttpError(409, 'Phiếu mượn đã có khoản phạt.');
            req.input('days', sql.Int, record.overdueDays).input('amount', sql.Decimal(10,2), record.overdueDays * 5000);
            const result = await req.query(`INSERT INTO dbo.fines(borrow_record_id,librarian_id,overdue_days,amount,reason)
                OUTPUT INSERTED.id,INSERTED.amount,INSERTED.status VALUES(@borrowId,@staffId,@days,@amount,@reason)`);
            req.input('readerId', sql.Int, record.borrower_id);
            await req.query(`UPDATE dbo.users SET status='LOCKED' WHERE id=@readerId`);
            return result.recordset[0];
        });
    },
};
