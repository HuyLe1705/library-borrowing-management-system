const { getPool, sql } = require('../config/database');

let tableEnsured = false;

async function ensureTable(pool) {
    if (tableEnsured) return;
    try {
        await pool.request().query(`
            IF OBJECT_ID('dbo.borrow_requests', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.borrow_requests (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    user_id INT NOT NULL REFERENCES dbo.users(id),
                    book_id INT NOT NULL REFERENCES dbo.books(id),
                    copy_id INT NULL REFERENCES dbo.book_copies(id),
                    request_date DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                    expected_pickup_date DATE NULL,
                    pickup_deadline DATE NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED')),
                    note NVARCHAR(500) NULL,
                    admin_note NVARCHAR(500) NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
                    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
                );
                CREATE INDEX idx_borrow_requests_user ON dbo.borrow_requests(user_id);
                CREATE INDEX idx_borrow_requests_status ON dbo.borrow_requests(status);
                CREATE INDEX idx_borrow_requests_book ON dbo.borrow_requests(book_id);
            END
        `);
        tableEnsured = true;
    } catch (err) {
        console.warn('ensureTable dbo.borrow_requests warning:', err.message);
    }
}

const HttpError = require('../utils/httpError');

const borrowRequestRepository = {
    // Kiểm tra tính hợp lệ của độc giả trước khi mượn (thẻ khóa, sách quá hạn, nợ phạt, giới hạn mượn)
    async checkEligibility(userId, role) {
        const pool = await getPool();
        await ensureTable(pool);

        const userRes = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`SELECT status FROM dbo.users WHERE id = @userId;`);

        const user = userRes.recordset[0];
        if (user && user.status === 'LOCKED') {
            throw new HttpError(403, 'Tài khoản độc giả đang bị khóa quyền mượn sách.');
        }

        const checkReq = pool.request();
        checkReq.input('borrowerId', sql.Int, userId);

        const activeCheck = await checkReq.query(`
            SELECT
                COUNT(*) AS activeCount,
                SUM(CASE WHEN status = 'OVERDUE' OR due_date < CAST(SYSDATETIME() AS DATE) THEN 1 ELSE 0 END) AS overdueCount
            FROM dbo.borrow_records
            WHERE borrower_id = @borrowerId AND status IN ('BORROWED', 'OVERDUE');

            SELECT COUNT(*) AS unpaidFines
            FROM dbo.fines f
            INNER JOIN dbo.borrow_records br ON br.id = f.borrow_record_id
            WHERE br.borrower_id = @borrowerId AND f.status = 'UNPAID';

            SELECT COUNT(*) AS pendingRequests
            FROM dbo.borrow_requests
            WHERE user_id = @borrowerId AND status IN ('PENDING', 'APPROVED');
        `);

        const overdueCount = activeCheck.recordsets[0]?.[0]?.overdueCount || 0;
        const unpaidFines = activeCheck.recordsets[1]?.[0]?.unpaidFines || 0;
        const activeCount = activeCheck.recordsets[0]?.[0]?.activeCount || 0;
        const pendingRequests = activeCheck.recordsets[2]?.[0]?.pendingRequests || 0;

        if (overdueCount > 0 || unpaidFines > 0) {
            throw new HttpError(403, 'Độc giả đang có sách quá hạn hoặc nợ tiền phạt chưa thanh toán.');
        }

        const maxAllowed = role === 'LECTURER' ? 10 : 5;
        if (activeCount + pendingRequests >= maxAllowed) {
            throw new HttpError(
                400,
                `Độc giả đã đạt giới hạn tối đa ${maxAllowed} cuốn sách (bao gồm sách đang mượn và yêu cầu đang chờ).`
            );
        }
    },

    // Tạo một yêu cầu mượn sách mới
    async create({ userId, bookId, copyId, note, expectedPickupDate }) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('bookId', sql.Int, bookId);
        request.input('copyId', sql.Int, copyId || null);
        request.input('note', sql.NVarChar(500), note || null);
        request.input('expectedPickupDate', sql.Date, expectedPickupDate || null);

        const result = await request.query(`
            INSERT INTO dbo.borrow_requests (
                user_id, book_id, copy_id, note, expected_pickup_date, status, request_date, created_at, updated_at
            )
            OUTPUT
                INSERTED.id,
                INSERTED.user_id AS userId,
                INSERTED.book_id AS bookId,
                INSERTED.copy_id AS copyId,
                INSERTED.note,
                INSERTED.expected_pickup_date AS expectedPickupDate,
                INSERTED.pickup_deadline AS pickupDeadline,
                INSERTED.status,
                INSERTED.admin_note AS adminNote,
                INSERTED.request_date AS requestDate,
                INSERTED.created_at AS createdAt,
                INSERTED.updated_at AS updatedAt
            VALUES (
                @userId, @bookId, @copyId, @note, @expectedPickupDate, 'PENDING', SYSDATETIME(), SYSDATETIME(), SYSDATETIME()
            );
        `);

        return result.recordset[0];
    },

    // Tìm kiếm yêu cầu đang chờ (PENDING / APPROVED) của 1 độc giả đối với 1 đầu sách cụ thể
    async findActiveByUserAndBook(userId, bookId) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        request.input('userId', sql.Int, userId);
        request.input('bookId', sql.Int, bookId);

        const result = await request.query(`
            SELECT TOP 1 id, status
            FROM dbo.borrow_requests
            WHERE user_id = @userId AND book_id = @bookId AND status IN ('PENDING', 'APPROVED');
        `);

        return result.recordset[0] || null;
    },

    // Lấy chi tiết 1 yêu cầu mượn sách theo ID
    async findById(id) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        request.input('id', sql.Int, id);

        const result = await request.query(`
            SELECT
                brq.id,
                brq.user_id AS userId,
                u.user_code AS borrowerCode,
                u.full_name AS borrowerName,
                u.email AS borrowerEmail,
                u.phone AS borrowerPhone,
                u.role AS borrowerRole,
                brq.book_id AS bookId,
                b.title AS bookTitle,
                b.author AS bookAuthor,
                b.cover_url AS coverUrl,
                brq.copy_id AS copyId,
                bc.barcode,
                bc.shelf_location AS shelfLocation,
                brq.note,
                brq.admin_note AS adminNote,
                brq.expected_pickup_date AS expectedPickupDate,
                brq.pickup_deadline AS pickupDeadline,
                brq.status,
                brq.request_date AS requestDate,
                brq.created_at AS createdAt,
                brq.updated_at AS updatedAt
            FROM dbo.borrow_requests brq
            INNER JOIN dbo.users u ON u.id = brq.user_id
            INNER JOIN dbo.books b ON b.id = brq.book_id
            LEFT JOIN dbo.book_copies bc ON bc.id = brq.copy_id
            WHERE brq.id = @id;
        `);

        return result.recordset[0] || null;
    },

    // Lấy danh sách yêu cầu mượn sách có phân trang và bộ lọc
    async findAll({ userId, userCode, bookId, status, page = 1, size = 20 } = {}) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        const conditions = [];

        if (userId) {
            request.input('userId', sql.Int, Number(userId));
            conditions.push(`brq.user_id = @userId`);
        }

        if (userCode) {
            request.input('userCode', sql.VarChar, String(userCode).trim());
            conditions.push(`u.user_code = @userCode`);
        }

        if (bookId) {
            request.input('bookId', sql.Int, Number(bookId));
            conditions.push(`brq.book_id = @bookId`);
        }

        if (status) {
            request.input('status', sql.VarChar, String(status).trim());
            conditions.push(`brq.status = @status`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (page - 1) * size;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, size);

        const countRes = await request.query(`
            SELECT COUNT(*) AS total
            FROM dbo.borrow_requests brq
            INNER JOIN dbo.users u ON u.id = brq.user_id
            ${whereClause};
        `);
        const total = countRes.recordset[0]?.total || 0;

        const itemsRes = await request.query(`
            SELECT
                brq.id,
                brq.user_id AS userId,
                u.user_code AS borrowerCode,
                u.full_name AS borrowerName,
                u.email AS borrowerEmail,
                u.phone AS borrowerPhone,
                u.role AS borrowerRole,
                brq.book_id AS bookId,
                b.title AS bookTitle,
                b.author AS bookAuthor,
                b.cover_url AS coverUrl,
                brq.copy_id AS copyId,
                bc.barcode,
                bc.shelf_location AS shelfLocation,
                brq.note,
                brq.admin_note AS adminNote,
                brq.expected_pickup_date AS expectedPickupDate,
                brq.pickup_deadline AS pickupDeadline,
                brq.status,
                brq.request_date AS requestDate,
                brq.created_at AS createdAt,
                brq.updated_at AS updatedAt
            FROM dbo.borrow_requests brq
            INNER JOIN dbo.users u ON u.id = brq.user_id
            INNER JOIN dbo.books b ON b.id = brq.book_id
            LEFT JOIN dbo.book_copies bc ON bc.id = brq.copy_id
            ${whereClause}
            ORDER BY brq.created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);

        return {
            items: itemsRes.recordset || [],
            pagination: {
                page,
                size,
                total,
                totalPages: Math.ceil(total / size) || 1,
            },
        };
    },

    // Cập nhật trạng thái yêu cầu mượn (APPROVED, REJECTED, CANCELLED, FULFILLED)
    async updateStatus(id, { status, adminNote, copyId, pickupDeadline }) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        request.input('id', sql.Int, id);
        request.input('status', sql.VarChar(20), status);
        request.input('adminNote', sql.NVarChar(500), adminNote || null);
        request.input('copyId', sql.Int, copyId || null);
        request.input('pickupDeadline', sql.Date, pickupDeadline || null);

        const result = await request.query(`
            UPDATE dbo.borrow_requests
            SET status = @status,
                admin_note = ISNULL(@adminNote, admin_note),
                copy_id = ISNULL(@copyId, copy_id),
                pickup_deadline = ISNULL(@pickupDeadline, pickup_deadline),
                updated_at = SYSDATETIME()
            OUTPUT
                INSERTED.id,
                INSERTED.status,
                INSERTED.admin_note AS adminNote,
                INSERTED.copy_id AS copyId,
                INSERTED.pickup_deadline AS pickupDeadline,
                INSERTED.updated_at AS updatedAt
            WHERE id = @id;
        `);

        return result.recordset[0] || null;
    },
};

module.exports = borrowRequestRepository;
