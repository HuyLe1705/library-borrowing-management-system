const { getPool, sql } = require('../config/database');

const userRepository = {
    // Tìm người dùng theo username, userCode (mã độc giả/MSSV/thủ thư) hoặc email
    async findByUsernameOrEmailOrUserCode(identifier) {
        if (!identifier) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('identifier', sql.VarChar, String(identifier).trim())
            .query(`
                SELECT
                    id,
                    user_code AS userCode,
                    username,
                    password_hash AS passwordHash,
                    full_name AS fullName,
                    email,
                    phone,
                    role,
                    status,
                    created_at AS createdAt
                FROM dbo.users
                WHERE username = @identifier OR user_code = @identifier OR email = @identifier;
            `);

        return result.recordset[0] || null;
    },

    // Lấy thông tin người dùng theo ID (không trả về hash mật khẩu)
    async findById(id) {
        if (!id) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(id))
            .query(`
                SELECT
                    id,
                    user_code AS userCode,
                    username,
                    full_name AS fullName,
                    email,
                    phone,
                    role,
                    status,
                    created_at AS createdAt
                FROM dbo.users
                WHERE id = @id;
            `);

        return result.recordset[0] || null;
    },

    // Tìm người dùng theo userCode
    async findByUserCode(userCode) {
        if (!userCode) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('userCode', sql.VarChar, String(userCode).trim())
            .query(`
                SELECT
                    id,
                    user_code AS userCode,
                    username,
                    full_name AS fullName,
                    email,
                    phone,
                    role,
                    status,
                    created_at AS createdAt
                FROM dbo.users
                WHERE user_code = @userCode;
            `);

        return result.recordset[0] || null;
    },

    // Tìm người dùng theo username
    async findByUsername(username) {
        if (!username) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('username', sql.VarChar, String(username).trim())
            .query(`
                SELECT id, user_code AS userCode, username
                FROM dbo.users
                WHERE username = @username;
            `);

        return result.recordset[0] || null;
    },

    // Tìm người dùng theo email
    async findByEmail(email) {
        if (!email) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, String(email).trim().toLowerCase())
            .query(`
                SELECT id, user_code AS userCode, email
                FROM dbo.users
                WHERE email = @email;
            `);

        return result.recordset[0] || null;
    },

    // Kiểm tra trùng username loại trừ user hiện tại (phục vụ cập nhật)
    async findByUsernameExcludeId(username, excludeId) {
        if (!username) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('username', sql.VarChar, String(username).trim())
            .input('excludeId', sql.Int, Number(excludeId))
            .query(`
                SELECT id, user_code AS userCode, username
                FROM dbo.users
                WHERE username = @username AND id <> @excludeId;
            `);

        return result.recordset[0] || null;
    },

    // Kiểm tra trùng email loại trừ user hiện tại (phục vụ cập nhật)
    async findByEmailExcludeId(email, excludeId) {
        if (!email) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('email', sql.VarChar, String(email).trim().toLowerCase())
            .input('excludeId', sql.Int, Number(excludeId))
            .query(`
                SELECT id, user_code AS userCode, email
                FROM dbo.users
                WHERE email = @email AND id <> @excludeId;
            `);

        return result.recordset[0] || null;
    },

    // Kiểm tra trùng userCode loại trừ user hiện tại (phục vụ cập nhật)
    async findByUserCodeExcludeId(userCode, excludeId) {
        if (!userCode) return null;
        const pool = await getPool();
        const result = await pool.request()
            .input('userCode', sql.VarChar, String(userCode).trim())
            .input('excludeId', sql.Int, Number(excludeId))
            .query(`
                SELECT id, user_code AS userCode
                FROM dbo.users
                WHERE user_code = @userCode AND id <> @excludeId;
            `);

        return result.recordset[0] || null;
    },

    // Tạo người dùng mới
    async create({ userCode, username, passwordHash, fullName, email, phone, role = 'STUDENT', status = 'ACTIVE' }) {
        const pool = await getPool();
        const result = await pool.request()
            .input('userCode', sql.VarChar, String(userCode).trim())
            .input('username', sql.VarChar, String(username).trim())
            .input('passwordHash', sql.VarChar, passwordHash)
            .input('fullName', sql.NVarChar, String(fullName).trim())
            .input('email', sql.VarChar, String(email).trim().toLowerCase())
            .input('phone', sql.VarChar, phone ? String(phone).trim() : null)
            .input('role', sql.VarChar, role)
            .input('status', sql.VarChar, status)
            .query(`
                INSERT INTO dbo.users (
                    user_code, username, password_hash, full_name, email, phone, role, status
                )
                OUTPUT INSERTED.id
                VALUES (
                    @userCode, @username, @passwordHash, @fullName, @email, @phone, @role, @status
                );
            `);

        const newUserId = result.recordset[0].id;
        return await this.findById(newUserId);
    },

    // Lấy danh sách người dùng có tìm kiếm, lọc theo vai trò, trạng thái và phân trang
    async findAll({ keyword, role, status, page = 1, size = 10, sort = 'createdAt', order = 'DESC' } = {}) {
        const pool = await getPool();
        const request = pool.request();
        const conditions = [];

        if (keyword) {
            request.input('keyword', sql.NVarChar, `%${keyword}%`);
            conditions.push(`(
                u.full_name LIKE @keyword
                OR u.username LIKE @keyword
                OR u.user_code LIKE @keyword
                OR u.email LIKE @keyword
                OR u.phone LIKE @keyword
            )`);
        }

        if (role) {
            request.input('role', sql.VarChar, String(role).trim().toUpperCase());
            conditions.push('u.role = @role');
        }

        if (status) {
            request.input('status', sql.VarChar, String(status).trim().toUpperCase());
            conditions.push('u.status = @status');
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const sortMap = {
            id: 'u.id',
            userCode: 'u.user_code',
            username: 'u.username',
            fullName: 'u.full_name',
            email: 'u.email',
            role: 'u.role',
            status: 'u.status',
            createdAt: 'u.created_at',
        };
        const sortColumn = sortMap[sort] || 'u.created_at';
        const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        const safePage = Math.max(1, Number(page) || 1);
        const safeSize = Math.max(1, Number(size) || 10);
        const offset = (safePage - 1) * safeSize;

        request.input('offset', sql.Int, offset);
        request.input('size', sql.Int, safeSize);

        const countQuery = `
            SELECT COUNT(1) AS total
            FROM dbo.users u
            ${whereClause};
        `;

        const dataQuery = `
            SELECT
                u.id,
                u.user_code AS userCode,
                u.username,
                u.full_name AS fullName,
                u.email,
                u.phone,
                u.role,
                u.status,
                u.created_at AS createdAt
            FROM dbo.users u
            ${whereClause}
            ORDER BY ${sortColumn} ${sortOrder}
            OFFSET @offset ROWS
            FETCH NEXT @size ROWS ONLY;
        `;

        const countResult = await request.query(countQuery);
        const dataResult = await request.query(dataQuery);

        const total = countResult.recordset[0]?.total || 0;
        const totalPages = Math.ceil(total / safeSize) || 1;

        return {
            items: dataResult.recordset,
            pagination: {
                page: safePage,
                size: safeSize,
                total,
                totalPages,
            },
        };
    },

    // Cập nhật thông tin người dùng
    async update(id, fields = {}) {
        const pool = await getPool();
        const request = pool.request();
        request.input('id', sql.Int, Number(id));

        const setClauses = [];

        if (fields.userCode !== undefined) {
            request.input('userCode', sql.VarChar, String(fields.userCode).trim());
            setClauses.push('user_code = @userCode');
        }

        if (fields.username !== undefined) {
            request.input('username', sql.VarChar, String(fields.username).trim());
            setClauses.push('username = @username');
        }

        if (fields.passwordHash !== undefined) {
            request.input('passwordHash', sql.VarChar, fields.passwordHash);
            setClauses.push('password_hash = @passwordHash');
        }

        if (fields.fullName !== undefined) {
            request.input('fullName', sql.NVarChar, String(fields.fullName).trim());
            setClauses.push('full_name = @fullName');
        }

        if (fields.email !== undefined) {
            request.input('email', sql.VarChar, String(fields.email).trim().toLowerCase());
            setClauses.push('email = @email');
        }

        if (fields.phone !== undefined) {
            request.input('phone', sql.VarChar, fields.phone ? String(fields.phone).trim() : null);
            setClauses.push('phone = @phone');
        }

        if (fields.role !== undefined) {
            request.input('role', sql.VarChar, String(fields.role).trim().toUpperCase());
            setClauses.push('role = @role');
        }

        if (fields.status !== undefined) {
            request.input('status', sql.VarChar, String(fields.status).trim().toUpperCase());
            setClauses.push('status = @status');
        }

        if (setClauses.length === 0) {
            return this.findById(id);
        }

        await request.query(`
            UPDATE dbo.users
            SET ${setClauses.join(', ')}
            WHERE id = @id;
        `);

        return this.findById(id);
    },

    // Cập nhật vai trò (Role)
    async updateRole(id, role) {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, Number(id))
            .input('role', sql.VarChar, String(role).trim().toUpperCase())
            .query(`
                UPDATE dbo.users
                SET role = @role
                WHERE id = @id;
            `);

        return this.findById(id);
    },

    // Cập nhật trạng thái (Status)
    async updateStatus(id, status) {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, Number(id))
            .input('status', sql.VarChar, String(status).trim().toUpperCase())
            .query(`
                UPDATE dbo.users
                SET status = @status
                WHERE id = @id;
            `);

        return this.findById(id);
    },

    // Kiểm tra ràng buộc khóa ngoại trước khi xóa
    async checkUserConstraints(id) {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.Int, Number(id))
            .query(`
                SELECT
                    (SELECT COUNT(1) FROM dbo.borrow_records WHERE borrower_id = @id AND status IN ('BORROWED', 'OVERDUE')) AS activeLoans,
                    (SELECT COUNT(1) FROM dbo.borrow_records WHERE borrower_id = @id OR librarian_id = @id) AS totalBorrowRecords,
                    (SELECT COUNT(1) FROM dbo.borrow_requests WHERE user_id = @id) AS totalBorrowRequests,
                    (SELECT COUNT(1) FROM dbo.fines f
                     INNER JOIN dbo.borrow_records br ON br.id = f.borrow_record_id
                     WHERE (br.borrower_id = @id OR f.librarian_id = @id) AND f.status = 'UNPAID') AS unpaidFines,
                    (SELECT COUNT(1) FROM dbo.fines f
                     INNER JOIN dbo.borrow_records br ON br.id = f.borrow_record_id
                     WHERE br.borrower_id = @id OR f.librarian_id = @id) AS totalFines;
            `);

        return result.recordset[0] || {
            activeLoans: 0,
            totalBorrowRecords: 0,
            totalBorrowRequests: 0,
            unpaidFines: 0,
            totalFines: 0,
        };
    },

    // Xóa vĩnh viễn người dùng
    async delete(id) {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, Number(id))
            .query(`
                UPDATE dbo.activity_logs SET user_id = NULL WHERE user_id = @id;
                DELETE FROM dbo.users WHERE id = @id;
            `);

        return true;
    },
};

module.exports = userRepository;
