require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const bookRoutes = require('./routes/book.routes');
const categoryRoutes = require('./routes/category.routes');

// Middleware
app.use(cors({
    origin: 'http://localhost:8080',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'BK Library API is running',
    });
});

// TODO: Đăng ký lại các router thực tế của dự án tại đây.
// Ví dụ:
app.use('/api/books', bookRoutes);
app.use('/api/categories', categoryRoutes);

// Khởi động server
const server = app.listen(PORT, () => {
    console.log('===================================');
    console.log('       BK LIBRARY BACKEND');
    console.log('===================================');
    console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`Port        : ${PORT}`);
    console.log(`API         : http://localhost:${PORT}/api`);
    console.log(`Health      : http://localhost:${PORT}/api/health`);
    console.log('===================================');
});

// Tắt server an toàn
const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Closing server...`);

    server.close((err) => {
        if (err) {
            console.error('Error while closing server:', err);
            process.exitCode = 1;
        } else {
            process.exitCode = 0;
        }
    });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
