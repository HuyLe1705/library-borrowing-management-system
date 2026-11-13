const { getPool, sql } = require('../config/database');

let tableEnsured = false;

// Đảm bảo bảng dbo.activity_logs tồn tại trên CSDL
async function ensureTable(pool) {
    if (tableEnsured) return;
    try {
        await pool.request().query(`
            IF OBJECT_ID('dbo.activity_logs', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.activity_logs (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    action VARCHAR(50) NOT NULL,
                    user_id INT NULL REFERENCES dbo.users(id),
                    user_code VARCHAR(20) NULL,
                    user_name NVARCHAR(100) NULL,
                    user_role VARCHAR(20) NULL,
                    target_type VARCHAR(50) NULL,
                    target_id INT NULL,
                    details NVARCHAR(MAX) NULL,
                    ip_address VARCHAR(50) NULL,
                    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME()
                );
                CREATE INDEX idx_activity_logs_created_at ON dbo.activity_logs(created_at DESC);
                CREATE INDEX idx_activity_logs_action ON dbo.activity_logs(action);
                CREATE INDEX idx_activity_logs_user_code ON dbo.activity_logs(user_code);
            END
        `);
        tableEnsured = true;
    } catch (err) {
        // Ghi nhận log nếu chưa tạo được bảng trong môi trường dev/mock
        console.warn('ensureTable dbo.activity_logs warning:', err.message);
    }
}

const activityLogRepository = {
    // Ghi lại một hoạt động mới vào hệ thống
    async create({ action, userId, userCode, userName, userRole, targetType, targetId, details, ipAddress }) {
        try {
            const pool = await getPool();
            await ensureTable(pool);

            const request = pool.request();
            request.input('action', sql.VarChar(50), action);
            request.input('userId', sql.Int, userId || null);
            request.input('userCode', sql.VarChar(20), userCode || null);
            request.input('userName', sql.NVarChar(100), userName || null);
            request.input('userRole', sql.VarChar(20), userRole || null);
            request.input('targetType', sql.VarChar(50), targetType || null);
            request.input('targetId', sql.Int, targetId || null);
            request.input('details', sql.NVarChar(sql.MAX), details || null);
            request.input('ipAddress', sql.VarChar(50), ipAddress || null);

            const result = await request.query(`
                INSERT INTO dbo.activity_logs (
                    action, user_id, user_code, user_name, user_role, target_type, target_id, details, ip_address, created_at
                )
                OUTPUT
                    INSERTED.id,
                    INSERTED.action,
                    INSERTED.user_id AS userId,
                    INSERTED.user_code AS userCode,
                    INSERTED.user_name AS userName,
                    INSERTED.user_role AS userRole,
                    INSERTED.target_type AS targetType,
                    INSERTED.target_id AS targetId,
                    INSERTED.details,
                    INSERTED.ip_address AS ipAddress,
                    INSERTED.created_at AS createdAt
                VALUES (
                    @action, @userId, @userCode, @userName, @userRole, @targetType, @targetId, @details, @ipAddress, SYSDATETIME()
                );
            `);

            return result.recordset[0];
        } catch (error) {
            console.error('Không thể ghi activity log:', error.message);
            return null;
        }
    },

    // Lấy danh sách activity logs có phân trang và bộ lọc
    async findAll({ page = 1, size = 20, action, userCode, targetType, from, to }) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        const conditions = [];

        if (action) {
            request.input('action', sql.VarChar, action.trim());
            conditions.push(`action = @action`);
        }

        if (userCode) {
            request.input('userCode', sql.VarChar, userCode.trim());
            conditions.push(`user_code = @userCode`);
        }

        if (targetType) {
            request.input('targetType', sql.VarChar, targetType.trim());
            conditions.push(`target_type = @targetType`);
        }

        if (from) {
            request.input('fromDate', sql.Date, from);
            conditions.push(`created_at >= @fromDate`);
        }

        if (to) {
            request.input('toDate', sql.Date, to);
            conditions.push(`created_at <= DATEADD(DAY, 1, @toDate)`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const offset = (page - 1) * size;

        request.input('offset', sql.Int, offset);
        request.input('limit', sql.Int, size);

        const countResult = await request.query(`
            SELECT COUNT(*) AS total
            FROM dbo.activity_logs
            ${whereClause};
        `);

        const total = countResult.recordset[0]?.total || 0;

        const itemsResult = await request.query(`
            SELECT
                id,
                action,
                user_id AS userId,
                user_code AS userCode,
                user_name AS userName,
                user_role AS userRole,
                target_type AS targetType,
                target_id AS targetId,
                details,
                ip_address AS ipAddress,
                created_at AS createdAt
            FROM dbo.activity_logs
            ${whereClause}
            ORDER BY created_at DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
        `);

        return {
            items: itemsResult.recordset || [],
            pagination: {
                page,
                size,
                total,
                totalPages: Math.ceil(total / size) || 1,
            },
        };
    },

    // Lấy N hoạt động gần nhất
    async getRecent(limit = 10) {
        const pool = await getPool();
        await ensureTable(pool);

        const request = pool.request();
        request.input('limit', sql.Int, limit);

        const result = await request.query(`
            SELECT TOP (@limit)
                id,
                action,
                user_id AS userId,
                user_code AS userCode,
                user_name AS userName,
                user_role AS userRole,
                target_type AS targetType,
                target_id AS targetId,
                details,
                ip_address AS ipAddress,
                created_at AS createdAt
            FROM dbo.activity_logs
            ORDER BY created_at DESC;
        `);

        return result.recordset || [];
    },
};

module.exports = activityLogRepository;
