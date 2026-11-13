const { sql } = require('../config/database');
const transaction = require('../utils/transaction');
const HttpError = require('../utils/httpError');

module.exports.transition = (id, { status, copyId, pickupDeadline, adminNote }, user) => transaction(async (request) => {
    const req = request().input('id', sql.Int, id).input('staffId', sql.Int, user.id)
        .input('note', sql.NVarChar(500), adminNote || null);
    const record = (await req.query(`SELECT * FROM dbo.borrow_requests WITH (UPDLOCK, HOLDLOCK) WHERE id=@id`)).recordset[0];
    if (!record) throw new HttpError(404, 'Không tìm thấy yêu cầu mượn.');
    if (!require('../utils/validation').staff(user) && (status !== 'CANCELLED' || record.user_id !== user.id || record.status !== 'PENDING')) {
        throw new HttpError(403, 'Không có quyền xử lý yêu cầu này.');
    }
    const allowed = { PENDING: ['APPROVED', 'REJECTED', 'CANCELLED'], APPROVED: ['FULFILLED', 'CANCELLED'] };
    if (!allowed[record.status]?.includes(status)) throw new HttpError(409, 'Yêu cầu đã được xử lý hoặc chuyển trạng thái không hợp lệ.');
    req.input('borrowerId', sql.Int, record.user_id).input('bookId', sql.Int, record.book_id);
    if (['APPROVED', 'FULFILLED'].includes(status)) {
        const reader = (await req.query(`SELECT * FROM dbo.users WITH (UPDLOCK) WHERE id=@borrowerId`)).recordset[0];
        const checks = await req.query(`
            SELECT COUNT(*) AS activeCount,
                COALESCE(SUM(CASE WHEN status='OVERDUE' OR due_date<CAST(SYSDATETIME() AS DATE) THEN 1 ELSE 0 END),0) AS overdue
            FROM dbo.borrow_records WHERE borrower_id=@borrowerId AND status IN ('BORROWED','OVERDUE');
            SELECT COUNT(*) AS unpaid FROM dbo.fines f JOIN dbo.borrow_records br ON br.id=f.borrow_record_id
            WHERE br.borrower_id=@borrowerId AND f.status='UNPAID';
            SELECT COUNT(*) AS duplicate FROM dbo.borrow_records br JOIN dbo.book_copies bc ON bc.id=br.copy_id
            WHERE br.borrower_id=@borrowerId AND bc.book_id=@bookId AND br.status IN ('BORROWED','OVERDUE');
        `);
        if (!reader || !['STUDENT','LECTURER'].includes(reader.role) || reader.status !== 'ACTIVE' || checks.recordsets[0][0].overdue || checks.recordsets[1][0].unpaid)
            throw new HttpError(403, 'Độc giả bị khóa, có sách quá hạn hoặc nợ phạt.');
        if (checks.recordsets[0][0].activeCount >= (reader.role === 'LECTURER' ? 10 : 5)) throw new HttpError(400, 'Độc giả đã đạt hạn mức mượn.');
        if (checks.recordsets[2][0].duplicate) throw new HttpError(409, 'Độc giả đang mượn đầu sách này.');
        req.input('copyId', sql.Int, status === 'FULFILLED' ? record.copy_id : (copyId || record.copy_id || null));
        const copy = (await req.query(`SELECT TOP 1 bc.id FROM dbo.book_copies bc WITH (UPDLOCK, HOLDLOCK)
            WHERE bc.book_id=@bookId AND bc.status='AVAILABLE' AND (@copyId IS NULL OR bc.id=@copyId)
            AND NOT EXISTS (SELECT 1 FROM dbo.borrow_requests r WITH (UPDLOCK, HOLDLOCK)
                WHERE r.copy_id=bc.id AND r.status='APPROVED' AND r.id<>@id) ORDER BY bc.id`)).recordset[0];
        if (!copy) throw new HttpError(409, 'Không có bản sao phù hợp sẵn sàng cho mượn.');
        req.input('selectedCopy', sql.Int, copy.id);
        if (status === 'APPROVED') {
            req.input('deadline', sql.Date, pickupDeadline || null);
            if ((await req.query(`SELECT 1 AS invalid WHERE @deadline<CAST(SYSDATETIME() AS DATE)`)).recordset.length) {
                throw new HttpError(400, 'Hạn nhận sách không được ở quá khứ.');
            }
            await req.query(`UPDATE dbo.borrow_requests SET copy_id=@selectedCopy,
                pickup_deadline=COALESCE(@deadline,DATEADD(DAY,3,CAST(SYSDATETIME() AS DATE))) WHERE id=@id`);
        } else {
            const expired = (await req.query(`SELECT id FROM dbo.borrow_requests WHERE id=@id AND pickup_deadline<CAST(SYSDATETIME() AS DATE)`)).recordset.length;
            if (expired) throw new HttpError(409, 'Đã hết hạn nhận sách. Hãy hủy và tạo yêu cầu mới.');
            req.input('days', sql.Int, reader.role === 'LECTURER' ? 30 : 14);
            await req.query(`UPDATE dbo.book_copies SET status='BORROWED' WHERE id=@selectedCopy;
                INSERT INTO dbo.borrow_records(copy_id,borrower_id,librarian_id,borrow_date,due_date,status)
                VALUES(@selectedCopy,@borrowerId,@staffId,CAST(SYSDATETIME() AS DATE),DATEADD(DAY,@days,CAST(SYSDATETIME() AS DATE)),'BORROWED')`);
        }
    }
    req.input('status', sql.VarChar(20), status);
    return (await req.query(`UPDATE dbo.borrow_requests SET status=@status, admin_note=COALESCE(@note,admin_note), updated_at=SYSDATETIME()
        OUTPUT INSERTED.id, INSERTED.status, INSERTED.copy_id AS copyId, INSERTED.pickup_deadline AS pickupDeadline WHERE id=@id`)).recordset[0];
});
