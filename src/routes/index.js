const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const bookRoutes = require('./book.routes');
const categoryRoutes = require('./category.routes');
const borrowRoutes = require('./borrow.routes');
const authRoutes = require('./auth.routes');
const uploadRoutes = require('./upload.routes');

const router = express.Router();

// 1. Cấu hình định nghĩa Swagger (Swagger Definition)
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'BK Library (LBMS) API',
            version: '1.0.0',
            description: 'Tài liệu API chi tiết dành cho hệ thống Quản lý Mượn trả Sách Thư viện (Library Borrowing Management System - LBMS)',
            contact: {
                name: 'Đội ngũ phát triển LBMS',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development Server (Local / Docker)',
            },
        ],
        tags: [
            {
                name: 'Books',
                description: 'Quản lý đầu sách, tìm kiếm, phân trang và bản sao sách vật lý',
            },
            {
                name: 'Categories',
                description: 'Quản lý danh mục thể loại sách trong thư viện',
            },
            {
                name: 'Borrows',
                description: 'Quy trình mượn sách (Checkout), trả sách (Return), gia hạn (Renew) và thanh toán tiền phạt (Fines)',
            },
            {
                name: 'Auth',
                description: 'Xác thực tài khoản, đăng nhập và thông tin phiên làm việc',
            },
            {
                name: 'Upload',
                description: 'Tải ảnh bìa sách lên máy chủ cục bộ (Local Storage)',
            },
            {
                name: 'System',
                description: 'Kiểm tra trạng thái máy chủ và kết nối cơ sở dữ liệu',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Nhập JWT token dạng: Bearer <token>',
                },
            },
            schemas: {
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Thao tác thành công.' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Mô tả thông báo lỗi chi tiết.' },
                    },
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1, description: 'ID tự tăng của danh mục' },
                        name: { type: 'string', example: 'Công nghệ phần mềm' },
                        description: { type: 'string', example: 'Sách về quy trình phát triển và quản lý dự án phần mềm' },
                    },
                },
                BookCopy: {
                    type: 'object',
                    properties: {
                        copyId: { type: 'integer', example: 1 },
                        barcode: { type: 'string', example: 'BC-SE-001' },
                        shelfLocation: { type: 'string', example: 'Kệ CNPM - Tầng 2 - Ô A1' },
                        status: { type: 'string', enum: ['AVAILABLE', 'BORROWED', 'LOST', 'MAINTENANCE'], example: 'AVAILABLE' },
                        entryDate: { type: 'string', format: 'date', example: '2026-10-19' },
                    },
                },
                Book: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1, description: 'ID tự động sinh bởi CSDL (IDENTITY)' },
                        title: { type: 'string', example: 'Software Engineering (10th Edition)' },
                        isbn: { type: 'string', example: '978-0133943030' },
                        author: { type: 'string', example: 'Ian Sommerville' },
                        categoryId: { type: 'integer', example: 1 },
                        category: { type: 'string', example: 'Công nghệ phần mềm' },
                        publisher: { type: 'string', example: 'Pearson' },
                        year: { type: 'integer', example: 2015 },
                        language: { type: 'string', example: 'Tiếng Việt' },
                        description: { type: 'string', example: 'Giáo trình Kỹ nghệ phần mềm và Quản lý dự án' },
                        coverUrl: { type: 'string', example: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a' },
                        totalCopies: { type: 'integer', example: 2 },
                        availableCopies: { type: 'integer', example: 2 },
                        copies: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/BookCopy' },
                        },
                    },
                },
                PaginatedBooks: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/Book' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                size: { type: 'integer', example: 10 },
                                total: { type: 'integer', example: 3 },
                                totalPages: { type: 'integer', example: 1 },
                            },
                        },
                    },
                },
                BorrowRecord: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        borrowDate: { type: 'string', format: 'date', example: '2026-10-19' },
                        dueDate: { type: 'string', format: 'date', example: '2026-11-02' },
                        returnDate: { type: 'string', format: 'date', nullable: true, example: null },
                        renewalCount: { type: 'integer', example: 0 },
                        status: { type: 'string', enum: ['BORROWED', 'RETURNED', 'OVERDUE'], example: 'BORROWED' },
                        borrowerCode: { type: 'string', example: '2311159' },
                        borrowerName: { type: 'string', example: 'Lê Thanh Huy' },
                        borrowerRole: { type: 'string', example: 'STUDENT' },
                        barcode: { type: 'string', example: 'BC-SE-001' },
                        shelfLocation: { type: 'string', example: 'Kệ CNPM - Tầng 2 - Ô A1' },
                        bookTitle: { type: 'string', example: 'Software Engineering (10th Edition)' },
                        fineId: { type: 'integer', nullable: true, example: null },
                        fineAmount: { type: 'number', nullable: true, example: null },
                        fineStatus: { type: 'string', nullable: true, example: null },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.js', './src/app.js'],
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
            auth: '/api/auth',
            upload: '/api/upload',
            books: '/api/books',
            categories: '/api/categories',
            borrows: '/api/borrows',
        },
    });
});

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/borrows', borrowRoutes);

module.exports = router;