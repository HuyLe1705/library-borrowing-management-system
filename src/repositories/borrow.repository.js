const { getPool, sql } = require('../config/database');
const HttpError = require('../utils/httpError');

const FINE_PER_DAY = 5000; // 5.000 VNĐ / ngày quá hạn

const borrowRepository = {
    // Lấy danh sách phiếu mượn (hỗ trợ lọc theo userCode, barcode, status)
    async findAll({ userCode, barcode, status }) {
        const pool = await getPool();
        const request = pool.request();
        const conditions = [];

        // Tự động cập nhật trạng thái OVERDUE cho các phiếu đã quá hạn trước khi truy vấn
        await pool.request().query(`
            UPDATE dbo.borrow_records
            SET status = 'OVERDUE'
            WHERE status = 'BORROWED' AND due_date < CAST(SYSDATETIME() AS DATE);
        `);

        if (userCode) {
            request.input('userCode', sql.VarChar, userCode);
            conditions.push(`u.user_code = @userCode`);
        }

        if (barcode) {
            request.input('barcode', sql.VarChar, barcode);
            conditions.push(`bc.barcode = @barcode`);
        }

        if (status) {
            request.input('status', sql.VarChar, status);
            conditions.push(`br.status = @status`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const result = await request.query(`
            SELECT
                br.id,
                br.borrow_date AS borrowDate,
                br.due_date AS dueDate,
                br.return_date AS returnDate,
                br.renewal_count AS renewalCount,
                br.status,
                u.user_code AS borrowerCode,
                u.full_name AS borrowerName,
                u.role AS borrowerRole,
                bc.barcode,
                bc.shelf_location AS shelfLocation,
                b.title AS bookTitle,
                f.id AS fineId,
                f.amount AS fineAmount,
                f.status AS fineStatus
            FROM dbo.borrow_records br
            INNER JOIN dbo.users u ON u.id = br.borrower_id
            INNER JOIN dbo.book_copies bc ON bc.id = br.copy_id
            INNER JOIN dbo.books b ON b.id = bc.book_id
            LEFT JOIN dbo.fines f ON f.borrow_record_id = br.id
            ${whereClause}
            ORDER BY br.created_at DESC;
        `);

        return result.recordset;
    },

    // Thực hiện Mượn sách (Theo userCode và barcode cuốn sách)
    async createBorrow({ userCode, barcode, librarianCode }) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const req = new sql.Request(transaction);
            req.input('userCode', sql.VarChar, userCode);
            req.input('barcode', sql.VarChar, barcode);
            req.input('librarianCode', sql.VarChar, librarianCode || 'TT001');

            // 1. Kiểm tra người mượn
            const userRes = await req.query(`
                SELECT id, user_code, full_name, role, status
                FROM dbo.users
                WHERE user_code = @userCode;
            `);
            const borrower = userRes.recordset[0];
            if (!borrower) {
                throw new HttpError(404, 'Không tìm thấy độc giả với mã này.');
            }
            if (!['STUDENT', 'LECTURER'].includes(borrower.role)) {
                throw new HttpError(400, 'Chỉ Sinh viên hoặc Giảng viên mới thuộc diện mượn sách.');
            }
            if (borrower.status === 'LOCKED') {
                throw new HttpError(403, 'Tài khoản độc giả đang bị khóa quyền mượn sách.');
            }

            // 2. Kiểm tra sách quá hạn hoặc tiền phạt chưa đóng
            req.input('borrowerId', sql.Int, borrower.id);
            const activeCheck = await req.query(`
                SELECT
                    COUNT(*) AS activeCount,
                    SUM(CASE WHEN status = 'OVERDUE' OR due_date < CAST(SYSDATETIME() AS DATE) THEN 1 ELSE 0 END) AS overdueCount
                FROM dbo.borrow_records
                WHERE borrower_id = @borrowerId AND status IN ('BORROWED', 'OVERDUE');

                SELECT COUNT(*) AS unpaidFines
                FROM dbo.fines f
                INNER JOIN dbo.borrow_records br ON br.id = f.borrow_record_id
                WHERE br.borrower_id = @borrowerId AND f.status = 'UNPAID';
            `);

            const { activeCount, overdueCount } = activeCheck.recordsets[0][0];
            const { unpaidFines } = activeCheck.recordsets[1][0];

            if (overdueCount > 0 || unpaidFines > 0) {
                throw new HttpError(403, 'Độc giả đang có sách quá hạn hoặc nợ tiền phạt chưa thanh toán.');
            }

            // 3. Áp dụng quy tắc A3: SV tối đa 5 cuốn/14 ngày, GV tối đa 10 cuốn/30 ngày
            const maxBooks = borrower.role === 'LECTURER' ? 10 : 5;
            const maxDays = borrower.role === 'LECTURER' ? 30 : 14;

            if (activeCount >= maxBooks) {
                throw new HttpError(
                    400,
                    `Độc giả (${borrower.role}) đã đạt giới hạn mượn tối đa ${maxBooks} cuốn.`
                );
            }

            // 4. Kiểm tra bản sao sách vật lý (Barcode)
            const copyRes = await req.query(`
                SELECT id, status, book_id
                FROM dbo.book_copies WITH (UPDLOCK)
                WHERE barcode = @barcode;
            `);
            const copy = copyRes.recordset[0];
            if (!copy) {
                throw new HttpError(404, 'Không tìm thấy bản sao sách với mã Barcode này.');
            }
            if (copy.status !== 'AVAILABLE') {
                throw new HttpError(409, `Bản sao sách hiện không sẵn sàng cho mượn (Trạng thái: ${copy.status}).`);
            }

            // 5. Lấy ID Thủ thư xử lý
            const libRes = await req.query(`
                SELECT id FROM dbo.users WHERE user_code = @librarianCode;
            `);
            const librarianId = libRes.recordset[0]?.id || borrower.id;

            // 6. Tạo phiếu mượn và cập nhật trạng thái bản sao sang BORROWED
            req.input('copyId', sql.Int, copy.id);
            req.input('librarianId', sql.Int, librarianId);
            req.input('maxDays', sql.Int, maxDays);

            const insertRes = await req.query(`
                UPDATE dbo.book_copies
                SET status = 'BORROWED'
                WHERE id = @copyId;

                INSERT INTO dbo.borrow_records (
                    copy_id, borrower_id, librarian_id, borrow_date, due_date, status
                )
                OUTPUT INSERTED.id, INSERTED.borrow_date AS borrowDate, INSERTED.due_date AS dueDate, INSERTED.status
                VALUES (
                    @copyId,
                    @borrowerId,
                    @librarianId,
                    CAST(SYSDATETIME() AS DATE),
                    DATEADD(DAY, @maxDays, CAST(SYSDATETIME() AS DATE)),
                    'BORROWED'
                );
            `);

            await transaction.commit();
            return insertRes.recordset[0];
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Thực hiện Trả sách theo Barcode (Tự động tính tiền phạt nếu quá hạn)
    async returnBook({ barcode, librarianCode }) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const req = new sql.Request(transaction);
            req.input('barcode', sql.VarChar, barcode);
            req.input('librarianCode', sql.VarChar, librarianCode || 'TT001');

            const recordRes = await req.query(`
                SELECT
                    br.id AS borrowId,
                    br.copy_id AS copyId,
                    br.borrower_id AS borrowerId,
                    br.due_date AS dueDate,
                    DATEDIFF(DAY, br.due_date, CAST(SYSDATETIME() AS DATE)) AS overdueDays
                FROM dbo.borrow_records br
                INNER JOIN dbo.book_copies bc ON bc.id = br.copy_id
                WHERE bc.barcode = @barcode AND br.status IN ('BORROWED', 'OVERDUE');
            `);

            const record = recordRes.recordset[0];
            if (!record) {
                throw new HttpError(404, 'Không tìm thấy giao dịch đang mượn nào ứng với mã Barcode này.');
            }

            const libRes = await req.query(`SELECT id FROM dbo.users WHERE user_code = @librarianCode;`);
            const librarianId = libRes.recordset[0]?.id || record.borrowerId;

            req.input('borrowId', sql.Int, record.borrowId);
            req.input('copyId', sql.Int, record.copyId);
            req.input('borrowerId', sql.Int, record.borrowerId);
            req.input('librarianId', sql.Int, librarianId);

            // Cập nhật trả sách & mở lại trạng thái AVAILABLE cho bản sao
            await req.query(`
                UPDATE dbo.borrow_records
                SET return_date = CAST(SYSDATETIME() AS DATE),
                    status = 'RETURNED'
                WHERE id = @borrowId;

                UPDATE dbo.book_copies
                SET status = 'AVAILABLE'
                WHERE id = @copyId;
            `);

            let fineCreated = null;

            // Nếu trả trễ hạn -> Tự động sinh phiếu phạt (fines) và khóa thẻ người dùng
            if (record.overdueDays > 0) {
                const fineAmount = record.overdueDays * FINE_PER_DAY;
                req.input('overdueDays', sql.Int, record.overdueDays);
                req.input('amount', sql.Decimal(10, 2), fineAmount);

                const fineRes = await req.query(`
                    INSERT INTO dbo.fines (borrow_record_id, librarian_id, overdue_days, amount, reason, status)
                    OUTPUT INSERTED.id AS fineId, INSERTED.overdue_days AS overdueDays, INSERTED.amount, INSERTED.status
                    VALUES (@borrowId, @librarianId, @overdueDays, @amount, N'Trả sách quá hạn', 'UNPAID');

                    UPDATE dbo.users
                    SET status = 'LOCKED'
                    WHERE id = @borrowerId;
                `);

                fineCreated = fineRes.recordset[0];
            }

            await transaction.commit();
            return {
                borrowId: record.borrowId,
                barcode,
                status: 'RETURNED',
                overdueDays: Math.max(0, record.overdueDays),
                fine: fineCreated,
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    // Thực hiện Gia hạn sách (Tối đa 1 lần, cộng thêm 7 ngày nếu chưa quá hạn)
    async renewBorrow(borrowId) {
        const pool = await getPool();
        const request = pool.request();
        request.input('id', sql.Int, borrowId);

        const recordRes = await request.query(`
            SELECT
                id,
                due_date AS dueDate,
                renewal_count AS renewalCount,
                status,
                DATEDIFF(DAY, due_date, CAST(SYSDATETIME() AS DATE)) AS overdueDays
            FROM dbo.borrow_records
            WHERE id = @id;
        `);

        const record = recordRes.recordset[0];
        if (!record) {
            throw new HttpError(404, 'Không tìm thấy phiếu mượn.');
        }
        if (record.status !== 'BORROWED' || record.overdueDays > 0) {
            throw new HttpError(400, 'Chỉ có thể gia hạn sách đang mượn và chưa bị quá hạn.');
        }
        if (record.renewalCount >= 1) {
            throw new HttpError(400, 'Phiếu mượn này đã hết số lần gia hạn tối đa (1 lần).');
        }

        const updateRes = await request.query(`
            UPDATE dbo.borrow_records
            SET due_date = DATEADD(DAY, 7, due_date),
                renewal_count = renewal_count + 1
            OUTPUT INSERTED.id, INSERTED.due_date AS newDueDate, INSERTED.renewal_count AS renewalCount
            WHERE id = @id;
        `);

        return updateRes.recordset[0];
    },

    // Thanh toán tiền phạt và mở khóa thẻ cho độc giả
    async payFine(fineId) {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const req = new sql.Request(transaction);
            req.input('fineId', sql.Int, fineId);

            const fineRes = await req.query(`
                SELECT f.id, f.status, br.borrower_id AS borrowerId
                FROM dbo.fines f
                INNER JOIN dbo.borrow_records br ON br.id = f.borrow_record_id
                WHERE f.id = @fineId;
            `);

            const fine = fineRes.recordset[0];
            if (!fine) {
                throw new HttpError(404, 'Không tìm thấy phiếu phạt.');
            }
            if (fine.status === 'PAID') {
                throw new HttpError(400, 'Phiếu phạt này đã được thanh toán trước đó.');
            }

            req.input('borrowerId', sql.Int, fine.borrowerId);

            await req.query(`
                UPDATE dbo.fines
                SET status = 'PAID', paid_at = SYSDATETIME()
                WHERE id = @fineId;

                -- Mở khóa thẻ nếu độc giả không còn khoản phạt UNPAID nào khác
                IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.fines f2
                    INNER JOIN dbo.borrow_records br2 ON br2.id = f2.borrow_record_id
                    WHERE br2.borrower_id = @borrowerId AND f2.status = 'UNPAID'
                )
                BEGIN
                    UPDATE dbo.users SET status = 'ACTIVE' WHERE id = @borrowerId;
                END
            `);

            await transaction.commit();
            return { fineId, status: 'PAID' };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },
};

module.exports = borrowRepository;