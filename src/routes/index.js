const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const bookRoutes = require('./book.routes');
const categoryRoutes = require('./category.routes');
const borrowRoutes = require('./borrow.routes');

const router = express.Router();

// 1. Cấu hình định nghĩa Swagger (Swagger Definition)
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BK Library (LBMS) API',
            version: '1.0.0',
            description: 'Tài liệu API dành cho hệ thống quản lý thư viện BK Library',
        },
        servers: [
            {
                url: 'http://localhost:5000', 
                description: 'Development Server',
            },
        ],
    },
    // Đường dẫn tới các file chứa comment định nghĩa API (quét tất cả file js trong thư mục routes)
     apis: ['./src/**/*.js'], 
};

// 2. Khởi tạo tài liệu Swagger
const swaggerSpecs = swaggerJsdoc(swaggerOptions);

// 3. Tạo endpoint hiển thị giao diện Swagger UI
router.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

/**
 * @openapi
 * /api:
 *   get:
 *     summary: Welcome endpoint
 *     description: Trả về thông tin chào mừng và danh sách các endpoint chính.
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Welcome to BK Library (LBMS) API',
        endpoints: {
            health: '/api/health',
            dbHealth: '/api/health/db',
            books: '/api/books',
            categories: '/api/categories',
            borrows: '/api/borrows',
        },
    });
});

router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/borrows', borrowRoutes);

module.exports = router;