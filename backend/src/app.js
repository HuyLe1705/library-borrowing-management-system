const express = require('express');
const path = require('path');
const cors = require('cors');
const { getPool } = require('./config/database');
const apiRoutes = require('./routes');

const app = express();

app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:8080',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 1. Phục vụ file tĩnh ảnh bìa đã tải lên
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. Health check
/**
 * @openapi
 * /api/health:
 *   get:
 *     summary: Kiểm tra tình trạng hoạt động của Node.js Express server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server đang hoạt động tốt.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "LBMS API is running."
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 timestamp:
 *                   type: string
 *                   example: "2026-10-20T11:30:00.000Z"
 *
 * /api/health/db:
 *   get:
 *     summary: Kiểm tra kết nối tới cơ sở dữ liệu SQL Server
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Kết nối SQL Server thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Kết nối SQL Server thành công."
 *                 database:
 *                   type: string
 *                   example: "LBMS_DB"
 *                 server:
 *                   type: string
 *                   example: "lbms-sqlserver"
 *       503:
 *         description: Không thể kết nối hoặc truy vấn SQL Server.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'LBMS API is running.',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

app.get('/api/health/db', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT DB_NAME() AS databaseName, @@SERVERNAME AS serverName
        `);

        res.status(200).json({
            success: true,
            message: 'Kết nối SQL Server thành công.',
            database: result.recordset[0].databaseName,
            server: result.recordset[0].serverName,
        });
    } catch (err) {
        console.error('Database connection failed:', err.message);
        res.status(503).json({
            success: false,
            message: 'Không thể kết nối hoặc truy vấn SQL Server.',
            error: process.env.NODE_ENV === 'production' ? undefined : err.message,
        });
    }
});

// 3. API routes
app.use('/api', apiRoutes);

// 4. Not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Không tìm thấy API: ${req.method} ${req.originalUrl}`,
    });
});

// 5. Global error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);

    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        success: false,
        message:
            process.env.NODE_ENV === 'production' && status === 500
                ? 'Đã xảy ra lỗi trên server.'
                : err.message || 'Internal Server Error',
    });
});

module.exports = app;