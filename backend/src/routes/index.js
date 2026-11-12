const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const bookRoutes = require('./book.routes');
const categoryRoutes = require('./category.routes');
const borrowRoutes = require('./borrow.routes');
const authRoutes = require('./auth.routes');
const uploadRoutes = require('./upload.routes');
const dashboardRoutes = require('./dashboard.routes');
const borrowRequestRoutes = require('./borrowRequest.routes');
const activityLogRoutes = require('./activityLog.routes');
const userRoutes = require('./user.routes');

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
                name: 'Dashboard',
                description: 'Thống kê tổng quan KPI và số liệu biểu đồ mượn/trả thư viện',
            },
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
                description: 'Quy trình mượn sách (Checkout), trả sách (Return), gia hạn (Renew), quá hạn (Overdue) và nộp phạt (Fines)',
            },
            {
                name: 'BorrowRequests',
                description: 'Quản lý yêu cầu đăng ký mượn sách (Reservation / Request) của độc giả',
            },
            {
                name: 'ActivityLogs',
                description: 'Nhật ký theo dõi các hoạt động trong hệ thống thư viện',
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
                name: 'Users',
                description: 'Quản lý người dùng: thêm, sửa, xóa, tìm kiếm, đổi vai trò (role) và trạng thái (status)',
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
                OverdueBorrow: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 3 },
                        borrowDate: { type: 'string', format: 'date', example: '2026-09-30' },
                        dueDate: { type: 'string', format: 'date', example: '2026-10-14' },
                        returnDate: { type: 'string', format: 'date', nullable: true, example: null },
                        renewalCount: { type: 'integer', example: 1 },
                        status: { type: 'string', example: 'OVERDUE' },
                        overdueDays: { type: 'integer', example: 11 },
                        estimatedFine: { type: 'number', example: 55000 },
                        reader: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer', example: 4 },
                                userCode: { type: 'string', example: 'SV001' },
                                fullName: { type: 'string', example: 'Nguyễn Văn A' },
                                email: { type: 'string', example: 'nguyenvana@student.edu.vn' },
                                phone: { type: 'string', example: '0903000001' },
                                role: { type: 'string', example: 'STUDENT' },
                                status: { type: 'string', example: 'ACTIVE' },
                            },
                        },
                        book: {
                            type: 'object',
                            properties: {
                                id: { type: 'integer', example: 6 },
                                title: { type: 'string', example: 'Database System Concepts' },
                                author: { type: 'string', example: 'Abraham Silberschatz' },
                                barcode: { type: 'string', example: 'BC-DB-002' },
                                shelfLocation: { type: 'string', example: 'Kệ CSDL - Tầng 2 - Ô B1' },
                                coverUrl: { type: 'string', example: 'https://covers.openlibrary.org/b/isbn/9780078022159-L.jpg' },
                            },
                        },
                    },
                },
                BorrowRequest: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        userId: { type: 'integer', example: 4 },
                        borrowerCode: { type: 'string', example: 'SV001' },
                        borrowerName: { type: 'string', example: 'Nguyễn Văn A' },
                        bookId: { type: 'integer', example: 2 },
                        bookTitle: { type: 'string', example: 'Clean Code' },
                        copyId: { type: 'integer', nullable: true, example: 3 },
                        barcode: { type: 'string', nullable: true, example: 'BC-SE-003' },
                        note: { type: 'string', example: 'Cần mượn làm bài tập nhóm' },
                        status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED'], example: 'PENDING' },
                        expectedPickupDate: { type: 'string', format: 'date', nullable: true, example: '2026-10-28' },
                        pickupDeadline: { type: 'string', format: 'date', nullable: true, example: '2026-10-31' },
                        adminNote: { type: 'string', nullable: true, example: null },
                        requestDate: { type: 'string', format: 'date-time', example: '2026-10-25T13:00:00.000Z' },
                    },
                },
                ActivityLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        action: { type: 'string', example: 'BORROW' },
                        userId: { type: 'integer', nullable: true, example: 2 },
                        userCode: { type: 'string', example: 'TT001' },
                        userName: { type: 'string', example: 'Nguyễn Thị Thủ Thư' },
                        userRole: { type: 'string', example: 'LIBRARIAN' },
                        targetType: { type: 'string', example: 'BORROW_RECORD' },
                        targetId: { type: 'integer', example: 10 },
                        details: { type: 'string', example: 'Cho độc giả SV001 mượn sách BC-SE-001' },
                        ipAddress: { type: 'string', nullable: true, example: '127.0.0.1' },
                        createdAt: { type: 'string', format: 'date-time', example: '2026-10-25T13:30:00.000Z' },
                    },
                },
                DashboardSummary: {
                    type: 'object',
                    properties: {
                        totalBooks: { type: 'integer', example: 30 },
                        totalCopies: { type: 'integer', example: 40 },
                        availableCopies: { type: 'integer', example: 35 },
                        totalReaders: { type: 'integer', example: 3 },
                        borrowedBooks: { type: 'integer', example: 2 },
                        overdueBooks: { type: 'integer', example: 1 },
                        totalBorrowTransactions: { type: 'integer', example: 5 },
                        unpaidFinesCount: { type: 'integer', example: 1 },
                        totalUnpaidFineAmount: { type: 'number', example: 25000 },
                        pendingRequests: { type: 'integer', example: 2 },
                    },
                },
                DashboardStatistics: {
                    type: 'object',
                    properties: {
                        period: { type: 'string', example: 'day' },
                        from: { type: 'string', example: '2026-10-19' },
                        to: { type: 'string', example: '2026-10-25' },
                        summary: {
                            type: 'object',
                            properties: {
                                totalBorrows: { type: 'integer', example: 25 },
                                totalReturns: { type: 'integer', example: 20 },
                            },
                        },
                        series: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    date: { type: 'string', example: '2026-10-25' },
                                    label: { type: 'string', example: '25/10' },
                                    borrows: { type: 'integer', example: 4 },
                                    returns: { type: 'integer', example: 3 },
                                },
                            },
                        },
                    },
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 4 },
                        userCode: { type: 'string', example: 'SV001' },
                        username: { type: 'string', example: 'nguyen.van.a' },
                        fullName: { type: 'string', example: 'Nguyễn Văn A' },
                        email: { type: 'string', example: 'vana.nguyen@example.com' },
                        phone: { type: 'string', example: '0901234567' },
                        role: { type: 'string', enum: ['STUDENT', 'LECTURER', 'LIBRARIAN', 'ADMIN'], example: 'STUDENT' },
                        status: { type: 'string', enum: ['ACTIVE', 'LOCKED'], example: 'ACTIVE' },
                        createdAt: { type: 'string', format: 'date-time', example: '2026-10-19T08:00:00.000Z' },
                    },
                },
                PaginatedUsers: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/User' },
                        },
                        pagination: {
                            type: 'object',
                            properties: {
                                page: { type: 'integer', example: 1 },
                                size: { type: 'integer', example: 10 },
                                total: { type: 'integer', example: 25 },
                                totalPages: { type: 'integer', example: 3 },
                            },
                        },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', example: 1 },
                        size: { type: 'integer', example: 20 },
                        total: { type: 'integer', example: 50 },
                        totalPages: { type: 'integer', example: 3 },
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
            borrowings: '/api/borrowings',
            borrowRequests: '/api/borrow-requests',
            dashboard: '/api/dashboard',
            activityLogs: '/api/activity-logs',
            users: '/api/users',
        },
    });
});

router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);
router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/borrows', borrowRoutes);
router.use('/borrowings', borrowRoutes);
router.use('/borrow-requests', borrowRequestRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/activity-logs', activityLogRoutes);
router.use('/activities', activityLogRoutes);
router.use('/users', userRoutes);

module.exports = router;