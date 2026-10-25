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

    // Lấy danh sách giao dịch mượn quá hạn (kèm thông tin độc giả, sách, hạn trả và số ngày quá hạn)
    async findOverdue({ userCode } = {}) {
        const pool = await getPool();
        const request = pool.request();

        // 1. Tự động đồng bộ trạng thái OVERDUE cho các phiếu đã quá hạn
        await pool.request().query(`
            UPDATE dbo.borrow_records
            SET status = 'OVERDUE'
            WHERE status = 'BORROWED' AND due_date < CAST(SYSDATETIME() AS DATE);
        `);

        const conditions = [
            `(br.status = 'OVERDUE' OR (br.status = 'BORROWED' AND br.due_date < CAST(SYSDATETIME() AS DATE)))`
        ];

        if (userCode) {
            request.input('userCode', sql.VarChar, String(userCode).trim());
            conditions.push(`u.user_code = @userCode`);
        }

        const whereClause = `WHERE ${conditions.join(' AND ')}`;

        const result = await request.query(`
            SELECT
                br.id,
                br.borrow_date AS borrowDate,
                br.due_date AS dueDate,
                br.return_date AS returnDate,
                br.renewal_count AS renewalCount,
                'OVERDUE' AS status,
                DATEDIFF(DAY, br.due_date, CAST(SYSDATETIME() AS DATE)) AS overdueDays,
                u.id AS borrowerId,
                u.user_code AS borrowerCode,
                u.full_name AS borrowerName,
                u.email AS borrowerEmail,
                u.phone AS borrowerPhone,
                u.role AS borrowerRole,
                u.status AS borrowerStatus,
                bc.id AS copyId,
                bc.barcode,
                bc.shelf_location AS shelfLocation,
                b.id AS bookId,
                b.title AS bookTitle,
                b.author AS bookAuthor,
                b.cover_url AS coverUrl,
                f.id AS fineId,
                f.amount AS fineAmount,
                f.status AS fineStatus
            FROM dbo.borrow_records br
            INNER JOIN dbo.users u ON u.id = br.borrower_id
            INNER JOIN dbo.book_copies bc ON bc.id = br.copy_id
            INNER JOIN dbo.books b ON b.id = bc.book_id
            LEFT JOIN dbo.fines f ON f.borrow_record_id = br.id
            ${whereClause}
            ORDER BY br.due_date ASC;
        `);

        return result.recordset.map((row) => ({
            id: row.id,
            borrowDate: row.borrowDate,
            dueDate: row.dueDate,
            returnDate: row.returnDate,
            renewalCount: row.renewalCount,
            status: 'OVERDUE',
            overdueDays: Math.max(1, row.overdueDays),
            estimatedFine: row.fineAmount || (Math.max(1, row.overdueDays) * FINE_PER_DAY),
            reader: {
                id: row.borrowerId,
                userCode: row.borrowerCode,
                fullName: row.borrowerName,
                email: row.borrowerEmail,
                phone: row.borrowerPhone,
                role: row.borrowerRole,
                status: row.borrowerStatus,
            },
            book: {
                id: row.bookId,
                title: row.bookTitle,
                author: row.bookAuthor,
                barcode: row.barcode,
                shelfLocation: row.shelfLocation,
                coverUrl: row.coverUrl,
            },
            borrowerCode: row.borrowerCode,
            borrowerName: row.borrowerName,
            barcode: row.barcode,
            bookTitle: row.bookTitle,
            fineId: row.fineId,
            fineAmount: row.fineAmount,
            fineStatus: row.fineStatus,
        }));
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

            // Chặn 1 độc giả mượn 2 bản sao của cùng 1 đầu sách cùng lúc
            req.input('bookId', sql.Int, copy.book_id);
            const duplicateBookCheck = await req.query(`
                SELECT COUNT(*) AS sameBookCount
                FROM dbo.borrow_records br
                INNER JOIN dbo.book_copies bc ON bc.id = br.copy_id
                WHERE br.borrower_id = @borrowerId
                  AND bc.book_id = @bookId
                  AND br.status IN ('BORROWED', 'OVERDUE');
            `);
            if (duplicateBookCheck.recordset[0].sameBookCount > 0) {
                throw new HttpError(409, 'Độc giả hiện đang mượn một bản sao khác của cùng đầu sách này.');
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
    async renewBorrow(borrowId, currentUser = null) {
        const pool = await getPool();
        const request = pool.request();
        request.input('id', sql.Int, borrowId);

        const recordRes = await request.query(`
            SELECT
                br.id,
                br.borrower_id AS borrowerId,
                u.user_code AS borrowerCode,
                br.due_date AS dueDate,
                br.renewal_count AS renewalCount,
                br.status,
                u.status AS userStatus,
                DATEDIFF(DAY, br.due_date, CAST(SYSDATETIME() AS DATE)) AS overdueDays,
                (SELECT COUNT(*) FROM dbo.fines f
                 INNER JOIN dbo.borrow_records br2 ON br2.id = f.borrow_record_id
                 WHERE br2.borrower_id = br.borrower_id AND f.status = 'UNPAID') AS unpaidFines,
                (SELECT COUNT(*) FROM dbo.borrow_records br3
                 WHERE br3.borrower_id = br.borrower_id
                   AND (br3.status = 'OVERDUE' OR (br3.status = 'BORROWED' AND br3.due_date < CAST(SYSDATETIME() AS DATE)))) AS anyOverdue
            FROM dbo.borrow_records br
            INNER JOIN dbo.users u ON u.id = br.borrower_id
            WHERE br.id = @id;
        `);

        const record = recordRes.recordset[0];
        if (!record) {
            throw new HttpError(404, 'Không tìm thấy phiếu mượn.');
        }

        // Kiểm tra quyền độc giả: độc giả chỉ được phép gia hạn phiếu mượn của chính mình
        if (currentUser && ['STUDENT', 'LECTURER'].includes(currentUser.role)) {
            if (record.borrowerId !== currentUser.id && record.borrowerCode !== currentUser.userCode) {
                throw new HttpError(403, 'Bạn chỉ có quyền gia hạn phiếu mượn của chính mình.');
            }
        }

        if (record.userStatus === 'LOCKED' || record.unpaidFines > 0 || record.anyOverdue > 0) {
            throw new HttpError(403, 'Không thể gia hạn vì độc giả đang bị khóa thẻ, có sách quá hạn hoặc nợ tiền phạt chưa đóng.');
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

                -- Chỉ mở khóa thẻ nếu độc giả hết khoản phạt UNPAID VÀ không còn giữ cuốn sách nào đang OVERDUE
                IF NOT EXISTS (
                    SELECT 1
                    FROM dbo.fines f2
                    INNER JOIN dbo.borrow_records br2 ON br2.id = f2.borrow_record_id
                    WHERE br2.borrower_id = @borrowerId AND f2.status = 'UNPAID'
                )
                AND NOT EXISTS (
                    SELECT 1
                    FROM dbo.borrow_records br3
                    WHERE br3.borrower_id = @borrowerId
                      AND (br3.status = 'OVERDUE' OR (br3.status = 'BORROWED' AND br3.due_date < CAST(SYSDATETIME() AS DATE)))
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