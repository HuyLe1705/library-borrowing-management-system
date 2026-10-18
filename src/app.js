const express = require('express');
const cors = require('cors');

const app = express();
const { getPool } = require('./config/database');
const apiRoutes = require('./routes');

// =========================
// Middleware
// =========================

app.use('/api', apiRoutes);

// Cho phép frontend gửi request đến backend.
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:8080',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

// Đọc dữ liệu JSON từ request body.
app.use(express.json({ limit: '1mb' }));

// Đọc dữ liệu dạng form.
app.use(express.urlencoded({ extended: true }));

// =========================
// Health check
// =========================

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'BK Library API is running.',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

// =========================
// API routes
// =========================

// Sau khi tạo src/routes/index.js, mở comment:
// const apiRoutes = require('./routes');
// app.use('/api', apiRoutes);

app.get('/api/health/db', async (req, res) => {
    try {
        const pool = await getPool();

        const result = await pool.request().query(`
            SELECT
                DB_NAME() AS databaseName,
                @@SERVERNAME AS serverName
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
            error:
                process.env.NODE_ENV === 'production'
                    ? undefined
                    : err.message,
        });
    }
});

// =========================
// Not found
// =========================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Không tìm thấy API: ${req.method} ${req.originalUrl}`,
    });
});

// =========================
// Global error handler
// =========================

app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        message:
            process.env.NODE_ENV === 'production'
                ? 'Đã xảy ra lỗi trên server.'
                : err.message || 'Internal Server Error',
    });
});

module.exports = app;