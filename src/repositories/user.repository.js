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

    // Tạo người dùng mới khi đăng ký
    async create({ userCode, username, passwordHash, fullName, email, phone, role = 'STUDENT' }) {
        const pool = await getPool();
        const result = await pool.request()
            .input('userCode', sql.VarChar, String(userCode).trim())
            .input('username', sql.VarChar, String(username).trim())
            .input('passwordHash', sql.VarChar, passwordHash)
            .input('fullName', sql.NVarChar, String(fullName).trim())
            .input('email', sql.VarChar, String(email).trim().toLowerCase())
            .input('phone', sql.VarChar, phone ? String(phone).trim() : null)
            .input('role', sql.VarChar, role)
            .query(`
                INSERT INTO dbo.users (
                    user_code, username, password_hash, full_name, email, phone, role, status
                )
                OUTPUT INSERTED.id
                VALUES (
                    @userCode, @username, @passwordHash, @fullName, @email, @phone, @role, 'ACTIVE'
                );
            `);

        const newUserId = result.recordset[0].id;
        return await this.findById(newUserId);
    },
};

module.exports = userRepository;
