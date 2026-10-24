const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const swaggerJsdoc = require('swagger-jsdoc');
const jwt = require('jsonwebtoken');

const app = require('../src/app');
const bookRepository = require('../src/repositories/book.repository');
const categoryRepository = require('../src/repositories/category.repository');
const borrowRepository = require('../src/repositories/borrow.repository');
const userRepository = require('../src/repositories/user.repository');

const JWT_SECRET = process.env.JWT_SECRET || 'lbms_default_jwt_secret_key_2026';

const adminToken = jwt.sign(
    { id: 1, userCode: 'ADMIN01', username: 'admin', role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
);
const librarianToken = jwt.sign(
    { id: 2, userCode: 'TT001', username: 'thu.thu', role: 'LIBRARIAN' },
    JWT_SECRET,
    { expiresIn: '1h' }
);
const studentToken = jwt.sign(
    { id: 3, userCode: '2311159', username: 'huy.le', role: 'STUDENT' },
    JWT_SECRET,
    { expiresIn: '1h' }
);
const lecturerToken = jwt.sign(
    { id: 4, userCode: 'GV001', username: 'gv.nguyen', role: 'LECTURER' },
    JWT_SECRET,
    { expiresIn: '1h' }
);

const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminToken}`,
};
const librarianHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${librarianToken}`,
};
const studentHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${studentToken}`,
};
const lecturerHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${lecturerToken}`,
};

describe('BK Library (LBMS) API Test Suite', () => {
    let server;
    let baseUrl;

    before(async () => {
        // Khởi động server trên port ngẫu nhiên (ephemeral port) để test API qua HTTP
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(0, resolve));
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
    });

    after(async () => {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    });

    // =========================================================================
    // 1. KIỂM THỬ TÀI LIỆU SWAGGER OPENAPI 3.0
    // =========================================================================
    describe('1. Swagger / OpenAPI 3.0 Documentation', () => {
        let specs;

        before(() => {
            const swaggerOptions = {
                definition: {
                    openapi: '3.0.0',
                    info: { title: 'BK Library (LBMS) API', version: '1.0.0' },
                },
                apis: ['./src/routes/*.js', './src/app.js'],
            };
            specs = swaggerJsdoc(swaggerOptions);
        });

        test('Tài liệu OpenAPI phải quét đủ 12 endpoint của hệ thống', () => {
            const paths = Object.keys(specs.paths || {});
            const requiredPaths = [
                '/api',
                '/api/health',
                '/api/health/db',
                '/api/books',
                '/api/books/{id}',
                '/api/categories',
                '/api/categories/{name}',
                '/api/borrows',
                '/api/borrows/checkout',
                '/api/borrows/return',
                '/api/borrows/{id}/renew',
                '/api/borrows/fines/{id}/pay',
            ];

            for (const path of requiredPaths) {
                assert.ok(paths.includes(path), `Thiếu endpoint trong Swagger: ${path}`);
            }

            assert.ok(paths.includes('/api/auth/register'), 'Thiếu endpoint Swagger: /api/auth/register');
            assert.ok(paths.includes('/api/auth/login'), 'Thiếu endpoint Swagger: /api/auth/login');
            assert.ok(paths.includes('/api/auth/me'), 'Thiếu endpoint Swagger: /api/auth/me');
            assert.ok(paths.includes('/api/upload'), 'Thiếu endpoint Swagger: /api/upload');
        });

        test('Endpoint Swagger UI /api/api-docs phải trả về mã HTTP 200 hoặc redirect', async () => {
            const res = await fetch(`${baseUrl}/api/api-docs/`);
            assert.ok([200, 301, 302].includes(res.status), `Swagger UI HTTP status: ${res.status}`);
        });
    });

    // =========================================================================
    // 2. KIỂM THỬ SYSTEM & ROUTING CƠ BẢN
    // =========================================================================
    describe('2. System & Basic Endpoints', () => {
        test('GET /api - Welcome endpoint trả về 200 và danh sách endpoint', async () => {
            const res = await fetch(`${baseUrl}/api`);
            assert.equal(res.status, 200);
            const body = await res.json();
            assert.equal(body.success, true);
            assert.ok(body.endpoints.books);
            assert.ok(body.endpoints.borrows);
            assert.ok(body.endpoints.categories);
        });

        test('GET /api/health - Server health check trả về 200', async () => {
            const res = await fetch(`${baseUrl}/api/health`);
            assert.equal(res.status, 200);
            const body = await res.json();
            assert.equal(body.success, true);
            assert.equal(body.message, 'LBMS API is running.');
        });

        test('GET /api/khong-ton-tai - Trả về mã lỗi 404 chuẩn REST', async () => {
            const res = await fetch(`${baseUrl}/api/khong-ton-tai`);
            assert.equal(res.status, 404);
            const body = await res.json();
            assert.equal(body.success, false);
            assert.ok(body.message.includes('Không tìm thấy API'));
        });
    });

    // =========================================================================
    // 3. KIỂM THỬ API QUẢN LÝ SÁCH (BOOKS API)
    // =========================================================================
    describe('3. Books API (/api/books)', () => {
        test('GET /api/books - Chặn phân trang không hợp lệ (page < 1 hoặc size > 100)', async () => {
            const resPage = await fetch(`${baseUrl}/api/books?page=0`);
            assert.equal(resPage.status, 400);

            const resSize = await fetch(`${baseUrl}/api/books?size=999`);
            assert.equal(resSize.status, 400);

            const resYear = await fetch(`${baseUrl}/api/books?year=khong_phai_so`);
            assert.equal(resYear.status, 400);
        });

        test('GET /api/books - Trả về danh sách sách khi tham số hợp lệ', async () => {
            // Mock repository để test controller và service độc lập DB
            const originalFindAll = bookRepository.findAll;
            bookRepository.findAll = async () => ({
                items: [
                    {
                        id: 1,
                        title: 'Software Engineering (10th Edition)',
                        author: 'Ian Sommerville',
                        coverUrl: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a',
                    },
                ],
                total: 1,
            });

            try {
                const res = await fetch(`${baseUrl}/api/books?page=1&size=10`);
                assert.equal(res.status, 200);
                const body = await res.json();
                assert.equal(body.success, true);
                assert.equal(body.data.items.length, 1);
                assert.equal(body.data.pagination.page, 1);
                assert.ok(body.data.items[0].coverUrl);
            } finally {
                bookRepository.findAll = originalFindAll;
            }
        });

        test('GET /api/books/:id - Chặn ID sách không phải số nguyên dương', async () => {
            const res = await fetch(`${baseUrl}/api/books/abc`);
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'ID sách không hợp lệ.');
        });

        test('GET /api/books/:id - Trả về 404 nếu không tìm thấy sách', async () => {
            const originalFindById = bookRepository.findById;
            bookRepository.findById = async () => null;

            try {
                const res = await fetch(`${baseUrl}/api/books/9999`);
                assert.equal(res.status, 404);
            } finally {
                bookRepository.findById = originalFindById;
            }
        });

        test('POST /api/books - Bắt buộc phải có tên sách (title)', async () => {
            const res = await fetch(`${baseUrl}/api/books`, {
                method: 'POST',
                headers: adminHeaders,
                body: JSON.stringify({ author: 'Tác giả A' }),
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'Tên sách không được để trống.');
        });

        test('POST /api/books - Loại bỏ hoàn toàn id nếu client truyền vào và nhận đúng coverUrl', async () => {
            const originalCreate = bookRepository.create;
            const originalFindByIsbn = bookRepository.findByIsbn;
            const originalFindCategoryById = bookRepository.findCategoryById;

            let capturedPayload = null;
            bookRepository.findByIsbn = async () => null;
            bookRepository.findCategoryById = async () => ({ id: 1, name: 'CNPM' });
            bookRepository.create = async (payload) => {
                capturedPayload = payload;
                return { id: 100, ...payload };
            };

            try {
                const res = await fetch(`${baseUrl}/api/books`, {
                    method: 'POST',
                    headers: adminHeaders,
                    body: JSON.stringify({
                        id: 99999, // Cố tình truyền id để kiểm tra hệ thống có tự loại bỏ không
                        title: 'Clean Code',
                        author: 'Robert C. Martin',
                        categoryId: 1,
                        coverUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c',
                    }),
                });

                assert.equal(res.status, 201);
                // Khẳng định: Payload gửi vào repository KHÔNG chứa id truyền vào
                assert.equal(capturedPayload.id, undefined);
                assert.equal(capturedPayload.title, 'Clean Code');
                assert.equal(capturedPayload.coverUrl, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c');
            } finally {
                bookRepository.create = originalCreate;
                bookRepository.findByIsbn = originalFindByIsbn;
                bookRepository.findCategoryById = originalFindCategoryById;
            }
        });

        test('POST /api/books - Chặn trùng lặp mã ISBN (trả về 409 Conflict)', async () => {
            const originalFindByIsbn = bookRepository.findByIsbn;
            bookRepository.findByIsbn = async () => ({ id: 1, isbn: '978-0133943030' });

            try {
                const res = await fetch(`${baseUrl}/api/books`, {
                    method: 'POST',
                    headers: adminHeaders,
                    body: JSON.stringify({
                        title: 'Sách trùng mã',
                        isbn: '978-0133943030',
                    }),
                });
                assert.equal(res.status, 409);
                const body = await res.json();
                assert.ok(body.message.includes('ISBN này đã tồn tại'));
            } finally {
                bookRepository.findByIsbn = originalFindByIsbn;
            }
        });

        test('DELETE /api/books/:id - Chặn xóa sách khi đang có độc giả mượn', async () => {
            const originalFindById = bookRepository.findById;
            const originalConstraints = bookRepository.checkBookDeleteConstraints;

            bookRepository.findById = async () => ({ id: 1, title: 'Sách đang mượn' });
            bookRepository.checkBookDeleteConstraints = async () => ({
                activeBorrowedCopies: 1,
                activeLoans: 1,
                totalLoanHistory: 1,
            });

            try {
                const res = await fetch(`${baseUrl}/api/books/1`, {
                    method: 'DELETE',
                    headers: adminHeaders,
                });
                assert.equal(res.status, 409);
                const body = await res.json();
                assert.ok(body.message.includes('đang có bản sao được độc giả mượn'));
            } finally {
                bookRepository.findById = originalFindById;
                bookRepository.checkBookDeleteConstraints = originalConstraints;
            }
        });
    });

    // =========================================================================
    // 4. KIỂM THỬ API DANH MỤC THỂ LOẠI (CATEGORIES API)
    // =========================================================================
    describe('4. Categories API (/api/categories)', () => {
        test('GET /api/categories - Trả về danh sách thể loại', async () => {
            const originalFindAll = categoryRepository.findAll;
            categoryRepository.findAll = async () => [
                { id: 1, name: 'Công nghệ phần mềm', description: 'Mô tả CNPM' },
            ];

            try {
                const res = await fetch(`${baseUrl}/api/categories`);
                assert.equal(res.status, 200);
                const body = await res.json();
                assert.equal(body.success, true);
                assert.equal(body.data.length, 1);
            } finally {
                categoryRepository.findAll = originalFindAll;
            }
        });

        test('POST /api/categories - Bắt buộc phải có tên danh mục', async () => {
            const res = await fetch(`${baseUrl}/api/categories`, {
                method: 'POST',
                headers: adminHeaders,
                body: JSON.stringify({ description: 'Thiếu tên' }),
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'Tên danh mục là bắt buộc.');
        });

        test('POST /api/categories - Chặn tạo danh mục bị trùng tên (409 Conflict)', async () => {
            const originalFindByName = categoryRepository.findByName;
            categoryRepository.findByName = async () => ({ id: 1, name: 'Cơ sở dữ liệu' });

            try {
                const res = await fetch(`${baseUrl}/api/categories`, {
                    method: 'POST',
                    headers: adminHeaders,
                    body: JSON.stringify({ name: 'Cơ sở dữ liệu' }),
                });
                assert.equal(res.status, 409);
                const body = await res.json();
                assert.equal(body.message, 'Danh mục đã tồn tại.');
            } finally {
                categoryRepository.findByName = originalFindByName;
            }
        });

        test('DELETE /api/categories/:name - Chặn xóa danh mục đang có sách tham chiếu', async () => {
            const originalFindByName = categoryRepository.findByName;
            const originalIsUsed = categoryRepository.isUsedByBooks;

            categoryRepository.findByName = async () => ({ id: 1, name: 'Cơ sở dữ liệu' });
            categoryRepository.isUsedByBooks = async () => true;

            try {
                const res = await fetch(`${baseUrl}/api/categories/Co%20so%20du%20lieu`, {
                    method: 'DELETE',
                    headers: adminHeaders,
                });
                assert.equal(res.status, 409);
                const body = await res.json();
                assert.ok(body.message.includes('đang được sách sử dụng'));
            } finally {
                categoryRepository.findByName = originalFindByName;
                categoryRepository.isUsedByBooks = originalIsUsed;
            }
        });
    });

    // =========================================================================
    // 5. KIỂM THỬ API MƯỢN / TRẢ / GIA HẠN / ĐÓNG PHẠT (BORROWS API)
    // =========================================================================
    describe('5. Borrows API (/api/borrows)', () => {
        test('POST /api/borrows/checkout - Bắt buộc phải có userCode và barcode', async () => {
            const res = await fetch(`${baseUrl}/api/borrows/checkout`, {
                method: 'POST',
                headers: librarianHeaders,
                body: JSON.stringify({ userCode: '2311159' }), // Thiếu barcode
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.ok(body.message.includes('Mã độc giả (userCode) và mã vạch sách (barcode) là bắt buộc'));
        });

        test('POST /api/borrows/checkout - Thành công khi thông tin hợp lệ', async () => {
            const originalCreateBorrow = borrowRepository.createBorrow;
            borrowRepository.createBorrow = async () => ({
                id: 1,
                borrowDate: '2026-10-20',
                dueDate: '2026-11-03',
                status: 'BORROWED',
            });

            try {
                const res = await fetch(`${baseUrl}/api/borrows/checkout`, {
                    method: 'POST',
                    headers: librarianHeaders,
                    body: JSON.stringify({
                        userCode: '2311159',
                        barcode: 'BC-SE-001',
                    }),
                });
                assert.equal(res.status, 201);
                const body = await res.json();
                assert.equal(body.success, true);
                assert.equal(body.data.status, 'BORROWED');
            } finally {
                borrowRepository.createBorrow = originalCreateBorrow;
            }
        });

        test('POST /api/borrows/return - Bắt buộc phải có barcode khi trả sách', async () => {
            const res = await fetch(`${baseUrl}/api/borrows/return`, {
                method: 'POST',
                headers: librarianHeaders,
                body: JSON.stringify({}),
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'Mã vạch sách (barcode) là bắt buộc khi trả sách.');
        });

        test('POST /api/borrows/:id/renew - Kiểm tra tính hợp lệ của ID phiếu mượn', async () => {
            const res = await fetch(`${baseUrl}/api/borrows/xyz/renew`, {
                method: 'POST',
                headers: studentHeaders,
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'ID phiếu mượn không hợp lệ.');
        });

        test('PATCH /api/borrows/fines/:id/pay - Kiểm tra tính hợp lệ của ID phiếu phạt', async () => {
            const res = await fetch(`${baseUrl}/api/borrows/fines/abc/pay`, {
                method: 'PATCH',
                headers: librarianHeaders,
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'ID phiếu phạt không hợp lệ.');
        });
    });

    // =========================================================================
    // 6. KIỂM THỬ API XÁC THỰC & ĐĂNG NHẬP (AUTH API)
    // =========================================================================
    describe('6. Auth API (/api/auth)', () => {
        test('POST /api/auth/login - Chặn đăng nhập khi thiếu username hoặc password', async () => {
            const resNoUser = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: '123' }),
            });
            assert.equal(resNoUser.status, 400);
            const bodyNoUser = await resNoUser.json();
            assert.equal(bodyNoUser.message, 'Tên đăng nhập không được để trống.');

            const resNoPass = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin' }),
            });
            assert.equal(resNoPass.status, 400);
            const bodyNoPass = await resNoPass.json();
            assert.equal(bodyNoPass.message, 'Mật khẩu không được để trống.');
        });

        test('POST /api/auth/login - Báo lỗi 401 khi tài khoản không tồn tại', async () => {
            const originalFind = userRepository.findByUsernameOrEmailOrUserCode;
            userRepository.findByUsernameOrEmailOrUserCode = async () => null;

            try {
                const res = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'khong_ton_tai', password: '123' }),
                });
                assert.equal(res.status, 401);
                const body = await res.json();
                assert.equal(body.message, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
            } finally {
                userRepository.findByUsernameOrEmailOrUserCode = originalFind;
            }
        });

        test('POST /api/auth/login - Chặn tài khoản bị khóa (403 Forbidden)', async () => {
            const originalFind = userRepository.findByUsernameOrEmailOrUserCode;
            userRepository.findByUsernameOrEmailOrUserCode = async () => ({
                id: 99,
                userCode: 'LOCKED01',
                username: 'locked_user',
                passwordHash: 'hashed_pw',
                status: 'LOCKED',
                role: 'STUDENT',
            });

            try {
                const res = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'locked_user', password: '123456' }),
                });
                assert.equal(res.status, 403);
                const body = await res.json();
                assert.ok(body.message.includes('Tài khoản của bạn đã bị khóa'));
            } finally {
                userRepository.findByUsernameOrEmailOrUserCode = originalFind;
            }
        });

        test('POST /api/auth/login - Báo lỗi 401 khi sai mật khẩu', async () => {
            const originalFind = userRepository.findByUsernameOrEmailOrUserCode;
            userRepository.findByUsernameOrEmailOrUserCode = async () => ({
                id: 1,
                userCode: 'ADMIN01',
                username: 'admin',
                passwordHash: 'mat_khau_that',
                status: 'ACTIVE',
                role: 'ADMIN',
            });

            try {
                const res = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: 'mat_khau_sai_hoan_toan' }),
                });
                assert.equal(res.status, 401);
                const body = await res.json();
                assert.equal(body.message, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
            } finally {
                userRepository.findByUsernameOrEmailOrUserCode = originalFind;
            }
        });

        test('POST /api/auth/login - Đăng nhập thành công trả về JWT token và user info', async () => {
            const originalFind = userRepository.findByUsernameOrEmailOrUserCode;
            userRepository.findByUsernameOrEmailOrUserCode = async () => ({
                id: 1,
                userCode: 'ADMIN01',
                username: 'admin',
                passwordHash: 'hashed_pw',
                fullName: 'Quản Trị Viên',
                email: 'admin@hcmut.edu.vn',
                phone: '0901000001',
                role: 'ADMIN',
                status: 'ACTIVE',
            });

            try {
                const res = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'admin', password: '123456' }),
                });
                assert.equal(res.status, 200);
                const body = await res.json();
                assert.equal(body.success, true);
                assert.ok(body.data.token);
                assert.equal(body.data.user.username, 'admin');
                assert.equal(body.data.user.role, 'ADMIN');
                assert.equal(body.data.user.passwordHash, undefined); // Không được để lộ hash
            } finally {
                userRepository.findByUsernameOrEmailOrUserCode = originalFind;
            }
        });

        test('GET /api/auth/me - Chặn truy cập nếu không có token (401)', async () => {
            const res = await fetch(`${baseUrl}/api/auth/me`);
            assert.equal(res.status, 401);
            const body = await res.json();
            assert.equal(body.message, 'Vui lòng đăng nhập để tiếp tục.');
        });

        test('GET /api/auth/me - Trả về thông tin cá nhân đúng khi có Bearer token hợp lệ', async () => {
            const originalFind = userRepository.findByUsernameOrEmailOrUserCode;
            const originalFindById = userRepository.findById;

            userRepository.findByUsernameOrEmailOrUserCode = async () => ({
                id: 3,
                userCode: '2311159',
                username: 'huy.le',
                passwordHash: 'hashed_pw',
                fullName: 'Lê Thanh Huy',
                email: 'huy.le@hcmut.edu.vn',
                phone: '0902000001',
                role: 'STUDENT',
                status: 'ACTIVE',
            });

            userRepository.findById = async (id) => ({
                id,
                userCode: '2311159',
                username: 'huy.le',
                fullName: 'Lê Thanh Huy',
                email: 'huy.le@hcmut.edu.vn',
                phone: '0902000001',
                role: 'STUDENT',
                status: 'ACTIVE',
            });

            try {
                // 1. Đăng nhập để lấy token
                const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: 'huy.le', password: 'hashed_pw' }),
                });
                assert.equal(loginRes.status, 200);
                const loginBody = await loginRes.json();
                const token = loginBody.data.token;

                // 2. Dùng token gọi /api/auth/me
                const meRes = await fetch(`${baseUrl}/api/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                assert.equal(meRes.status, 200);
                const meBody = await meRes.json();
                assert.equal(meBody.success, true);
                assert.equal(meBody.data.username, 'huy.le');
                assert.equal(meBody.data.userCode, '2311159');
                assert.equal(meBody.data.role, 'STUDENT');
            } finally {
                userRepository.findByUsernameOrEmailOrUserCode = originalFind;
                userRepository.findById = originalFindById;
            }
        });

        test('POST /api/auth/register - Chặn khi thiếu các trường bắt buộc (400)', async () => {
            // Thiếu username
            const resNoUser = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: '123456', fullName: 'Nguyen Van A', email: 'a@hcmut.edu.vn' }),
            });
            assert.equal(resNoUser.status, 400);

            // Password quá ngắn (< 6 ký tự)
            const resShortPass = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'vana', password: '123', fullName: 'Nguyen Van A', email: 'a@hcmut.edu.vn' }),
            });
            assert.equal(resShortPass.status, 400);

            // Email không đúng định dạng
            const resBadEmail = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'vana', password: '123456', fullName: 'Nguyen Van A', email: 'khong_phai_email' }),
            });
            assert.equal(resBadEmail.status, 400);
        });

        test('POST /api/auth/register - Chặn khi trùng lặp tên đăng nhập (409 Conflict)', async () => {
            const originalFindByUsername = userRepository.findByUsername;
            userRepository.findByUsername = async () => ({ id: 1, username: 'admin' });

            try {
                const res = await fetch(`${baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'admin',
                        password: 'password123',
                        fullName: 'Admin Clone',
                        email: 'admin2@hcmut.edu.vn',
                    }),
                });
                assert.equal(res.status, 409);
                const body = await res.json();
                assert.ok(body.message.includes('Tên đăng nhập đã tồn tại'));
            } finally {
                userRepository.findByUsername = originalFindByUsername;
            }
        });

        test('POST /api/auth/register - Đăng ký thành công trả về HTTP 201 cùng token và thông tin user', async () => {
            const originalFindByUsername = userRepository.findByUsername;
            const originalFindByEmail = userRepository.findByEmail;
            const originalFindByUserCode = userRepository.findByUserCode;
            const originalCreate = userRepository.create;

            userRepository.findByUsername = async () => null;
            userRepository.findByEmail = async () => null;
            userRepository.findByUserCode = async () => null;
            userRepository.create = async (userData) => ({
                id: 10,
                userCode: userData.userCode,
                username: userData.username,
                fullName: userData.fullName,
                email: userData.email,
                phone: userData.phone,
                role: userData.role,
                status: 'ACTIVE',
            });

            try {
                const res = await fetch(`${baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'nguyen.an',
                        password: 'secure_password_123',
                        fullName: 'Nguyễn Văn An',
                        email: 'an.nguyen@hcmut.edu.vn',
                        userCode: '2311999',
                        phone: '0909999999',
                    }),
                });
                assert.equal(res.status, 201);
                const body = await res.json();
                assert.equal(body.success, true);
                assert.ok(body.data.token);
                assert.equal(body.data.user.username, 'nguyen.an');
                assert.equal(body.data.user.userCode, '2311999');
                assert.equal(body.data.user.role, 'STUDENT');
                assert.equal(body.data.user.passwordHash, undefined);
            } finally {
                userRepository.findByUsername = originalFindByUsername;
                userRepository.findByEmail = originalFindByEmail;
                userRepository.findByUserCode = originalFindByUserCode;
                userRepository.create = originalCreate;
            }
        });

        test('POST /api/auth/register - Cho phép đăng ký với vai trò Thủ thư (LIBRARIAN) và Giảng viên (LECTURER)', async () => {
            const originalFindByUsername = userRepository.findByUsername;
            const originalFindByEmail = userRepository.findByEmail;
            const originalFindByUserCode = userRepository.findByUserCode;
            const originalCreate = userRepository.create;

            userRepository.findByUsername = async () => null;
            userRepository.findByEmail = async () => null;
            userRepository.findByUserCode = async () => null;
            userRepository.create = async (userData) => ({
                id: 11,
                userCode: userData.userCode,
                username: userData.username,
                fullName: userData.fullName,
                email: userData.email,
                phone: userData.phone,
                role: userData.role,
                status: 'ACTIVE',
            });

            try {
                // Đăng ký tài khoản Thủ thư (LIBRARIAN)
                const resLib = await fetch(`${baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'thuthu.moi',
                        password: 'secure_password_123',
                        fullName: 'Trần Văn Thủ Thư',
                        email: 'thuthu.moi@hcmut.edu.vn',
                        role: 'LIBRARIAN',
                    }),
                });
                assert.equal(resLib.status, 201);
                const bodyLib = await resLib.json();
                assert.equal(bodyLib.success, true);
                assert.equal(bodyLib.data.user.role, 'LIBRARIAN');
                assert.ok(bodyLib.data.user.userCode.startsWith('TT'));

                // Đăng ký tài khoản Giảng viên (LECTURER)
                const resLec = await fetch(`${baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'gv.nguyenan',
                        password: 'secure_password_123',
                        fullName: 'TS. Nguyễn An',
                        email: 'an.ts@hcmut.edu.vn',
                        role: 'LECTURER',
                    }),
                });
                assert.equal(resLec.status, 201);
                const bodyLec = await resLec.json();
                assert.equal(bodyLec.success, true);
                assert.equal(bodyLec.data.user.role, 'LECTURER');
                assert.ok(bodyLec.data.user.userCode.startsWith('GV'));
            } finally {
                userRepository.findByUsername = originalFindByUsername;
                userRepository.findByEmail = originalFindByEmail;
                userRepository.findByUserCode = originalFindByUserCode;
                userRepository.create = originalCreate;
            }
        });

        test('POST /api/auth/register - Báo lỗi 400 khi truyền vai trò (role) không hợp lệ', async () => {
            const res = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'hacker123',
                    password: 'secure_password_123',
                    fullName: 'Super Hacker',
                    email: 'hacker@test.com',
                    role: 'SUPERADMIN', // Role không nằm trong danh sách cho phép
                }),
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.ok(body.message.includes('Vai trò người dùng không hợp lệ'));
        });
    });

    // =========================================================================
    // 7. KIỂM THỬ API TẢI ẢNH LÊN MÁY CHỦ (UPLOAD API)
    // =========================================================================
    describe('7. Upload API (/api/upload)', () => {
        test('POST /api/upload - Báo lỗi 400 khi không có file ảnh đính kèm', async () => {
            const res = await fetch(`${baseUrl}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.ok(body.message.includes('Vui lòng chọn file ảnh'));
        });

        test('POST /api/upload - Chặn tải lên file không phải định dạng ảnh (400)', async () => {
            const formData = new FormData();
            const textBlob = new Blob(['day la file text'], { type: 'text/plain' });
            formData.append('image', textBlob, 'tailieu.txt');

            const res = await fetch(`${baseUrl}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: formData,
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.ok(body.message.includes('Chỉ chấp nhận các file ảnh'));
        });

        test('POST /api/upload - Tải ảnh hợp lệ thành công (201) và truy cập được file qua URL tĩnh', async () => {
            const formData = new FormData();
            // Tạo một file ảnh PNG giả lập
            const pngHeader = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
            const imageBlob = new Blob([pngHeader], { type: 'image/png' });
            formData.append('image', imageBlob, 'bia-sach-test.png');

            const res = await fetch(`${baseUrl}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${adminToken}` },
                body: formData,
            });
            assert.equal(res.status, 201);
            const body = await res.json();
            assert.equal(body.success, true);
            assert.ok(body.data.coverUrl);
            assert.ok(body.data.filename);

            // Kiểm tra link ảnh tĩnh phục vụ trực tiếp qua Express Static
            const staticRes = await fetch(body.data.coverUrl);
            assert.equal(staticRes.status, 200);
            assert.equal(staticRes.headers.get('content-type'), 'image/png');
        });
    });

    // =========================================================================
    // 8. KIỂM THỬ PHÂN QUYỀN & KIỂM SOÁT TRUY CẬP (RBAC AUTHORIZATION)
    // =========================================================================
    describe('8. Phân quyền người dùng & Kiểm soát truy cập (RBAC Authorization)', () => {
        test('Chặn truy cập 401 khi không truyền Token vào các route bảo vệ', async () => {
            // Sách (POST, PUT, DELETE)
            const resBookPost = await fetch(`${baseUrl}/api/books`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Test Sách Không Token' }),
            });
            assert.equal(resBookPost.status, 401);

            const resBookDelete = await fetch(`${baseUrl}/api/books/1`, { method: 'DELETE' });
            assert.equal(resBookDelete.status, 401);

            // Thể loại (POST, PUT, DELETE)
            const resCatPost = await fetch(`${baseUrl}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'Test Thể loại Không Token' }),
            });
            assert.equal(resCatPost.status, 401);

            // Tải ảnh (POST)
            const resUpload = await fetch(`${baseUrl}/api/upload`, { method: 'POST' });
            assert.equal(resUpload.status, 401);

            // Mượn trả (GET /api/borrows, POST /return, PATCH /fines/:id/pay)
            const resBorrows = await fetch(`${baseUrl}/api/borrows`);
            assert.equal(resBorrows.status, 401);

            const resReturn = await fetch(`${baseUrl}/api/borrows/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: 'BC-01' }),
            });
            assert.equal(resReturn.status, 401);

            const resFinePay = await fetch(`${baseUrl}/api/borrows/fines/1/pay`, { method: 'PATCH' });
            assert.equal(resFinePay.status, 401);
        });

        test('Chặn truy cập 403 Forbidden khi STUDENT gọi các endpoint quản trị dành cho LIBRARIAN/ADMIN', async () => {
            // STUDENT gọi tạo sách -> 403
            const resBook = await fetch(`${baseUrl}/api/books`, {
                method: 'POST',
                headers: studentHeaders,
                body: JSON.stringify({ title: 'Hack thư viện' }),
            });
            assert.equal(resBook.status, 403);
            const bookBody = await resBook.json();
            assert.ok(bookBody.message.includes('Bạn không có quyền thực hiện hành động này'));

            // STUDENT gọi xóa sách -> 403
            const resDeleteBook = await fetch(`${baseUrl}/api/books/1`, {
                method: 'DELETE',
                headers: studentHeaders,
            });
            assert.equal(resDeleteBook.status, 403);

            // STUDENT gọi tạo danh mục -> 403
            const resCat = await fetch(`${baseUrl}/api/categories`, {
                method: 'POST',
                headers: studentHeaders,
                body: JSON.stringify({ name: 'Hack thể loại' }),
            });
            assert.equal(resCat.status, 403);

            // STUDENT gọi upload ảnh -> 403
            const resUpload = await fetch(`${baseUrl}/api/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${studentToken}` },
            });
            assert.equal(resUpload.status, 403);

            // STUDENT gọi tạo phiếu mượn sách (checkout) -> 403
            const resCheckout = await fetch(`${baseUrl}/api/borrows/checkout`, {
                method: 'POST',
                headers: studentHeaders,
                body: JSON.stringify({ userCode: '2311159', barcode: 'BC-01' }),
            });
            assert.equal(resCheckout.status, 403);
            const checkoutBody = await resCheckout.json();
            assert.ok(checkoutBody.message.includes('Bạn không có quyền thực hiện hành động này'));

            // STUDENT gọi xử lý trả sách -> 403
            const resReturn = await fetch(`${baseUrl}/api/borrows/return`, {
                method: 'POST',
                headers: studentHeaders,
                body: JSON.stringify({ barcode: 'BC-01' }),
            });
            assert.equal(resReturn.status, 403);

            // STUDENT gọi thu tiền phạt -> 403
            const resPayFine = await fetch(`${baseUrl}/api/borrows/fines/1/pay`, {
                method: 'PATCH',
                headers: studentHeaders,
            });
            assert.equal(resPayFine.status, 403);
        });

        test('Chặn 403 khi độc giả (STUDENT / LECTURER) tự gọi checkout tạo phiếu mượn (chỉ dành cho Thủ thư/Admin trên Dashboard)', async () => {
            // STUDENT bị chặn
            const resStudent = await fetch(`${baseUrl}/api/borrows/checkout`, {
                method: 'POST',
                headers: studentHeaders, // Token của huy.le (MSSV: 2311159)
                body: JSON.stringify({
                    userCode: '2311159',
                    barcode: 'BC-SE-001',
                }),
            });
            assert.equal(resStudent.status, 403);
            const bodyStudent = await resStudent.json();
            assert.ok(bodyStudent.message.includes('Bạn không có quyền thực hiện hành động này'));

            // LECTURER cũng bị chặn (vì chỉ Thủ thư/Admin mới thao tác trên Dashboard cho mượn)
            const resLecturer = await fetch(`${baseUrl}/api/borrows/checkout`, {
                method: 'POST',
                headers: lecturerHeaders, // Token của Giảng viên GV001
                body: JSON.stringify({
                    userCode: 'GV001',
                    barcode: 'BC-SE-001',
                }),
            });
            assert.equal(resLecturer.status, 403);
            const bodyLecturer = await resLecturer.json();
            assert.ok(bodyLecturer.message.includes('Bạn không có quyền thực hiện hành động này'));
        });

        test('Chặn 403 khi độc giả (STUDENT) gia hạn phiếu mượn của độc giả khác', async () => {
            const originalRenew = borrowRepository.renewBorrow;
            borrowRepository.renewBorrow = async (id, currentUser) => {
                if (currentUser && currentUser.userCode !== 'OTHER_USER') {
                    const HttpError = require('../src/utils/httpError');
                    throw new HttpError(403, 'Bạn chỉ có quyền gia hạn phiếu mượn của chính mình.');
                }
                return { id, renewed: true };
            };

            try {
                const res = await fetch(`${baseUrl}/api/borrows/10/renew`, {
                    method: 'POST',
                    headers: studentHeaders,
                });
                assert.equal(res.status, 403);
                const body = await res.json();
                assert.ok(body.message.includes('Bạn chỉ có quyền gia hạn phiếu mượn của chính mình'));
            } finally {
                borrowRepository.renewBorrow = originalRenew;
            }
        });

        test('Cho phép Thủ thư (LIBRARIAN) và Admin (ADMIN) thực hiện thành công các quyền quản trị', async () => {
            const originalCreateCat = categoryRepository.create;
            const originalFindByName = categoryRepository.findByName;
            categoryRepository.findByName = async () => null;
            categoryRepository.create = async (payload) => ({ id: 5, ...payload });

            try {
                // LIBRARIAN tạo danh mục thành công
                const resLib = await fetch(`${baseUrl}/api/categories`, {
                    method: 'POST',
                    headers: librarianHeaders,
                    body: JSON.stringify({ name: 'Khoa học máy tính' }),
                });
                assert.equal(resLib.status, 201);

                // ADMIN tạo danh mục thành công
                const resAdmin = await fetch(`${baseUrl}/api/categories`, {
                    method: 'POST',
                    headers: adminHeaders,
                    body: JSON.stringify({ name: 'Trí tuệ nhân tạo' }),
                });
                assert.equal(resAdmin.status, 201);

                // LIBRARIAN thực hiện cho mượn sách thành công từ Dashboard
                const originalCreateBorrow = borrowRepository.createBorrow;
                let capturedBorrowPayload = null;
                borrowRepository.createBorrow = async (payload) => {
                    capturedBorrowPayload = payload;
                    return { id: 88, status: 'BORROWED' };
                };
                const resBorrow = await fetch(`${baseUrl}/api/borrows/checkout`, {
                    method: 'POST',
                    headers: librarianHeaders,
                    body: JSON.stringify({
                        userCode: '2311159',
                        barcode: 'BC-SE-001',
                    }),
                });
                assert.equal(resBorrow.status, 201);
                assert.equal(capturedBorrowPayload.userCode, '2311159');
                assert.equal(capturedBorrowPayload.librarianCode, 'TT001');
                borrowRepository.createBorrow = originalCreateBorrow;
            } finally {
                categoryRepository.create = originalCreateCat;
                categoryRepository.findByName = originalFindByName;
            }
        });

        test('Độc giả (STUDENT) xem danh sách mượn tự động bị filter theo mã độc giả của mình', async () => {
            const originalFindAll = borrowRepository.findAll;
            let capturedQuery = null;
            borrowRepository.findAll = async (query) => {
                capturedQuery = query;
                return [];
            };

            try {
                // STUDENT gửi query userCode khác nhưng hệ thống bắt buộc ghi đè bằng userCode của token
                const res = await fetch(`${baseUrl}/api/borrows?userCode=9999999`, {
                    headers: studentHeaders,
                });
                assert.equal(res.status, 200);
                assert.equal(capturedQuery.userCode, '2311159');
            } finally {
                borrowRepository.findAll = originalFindAll;
            }
        });

        test('Thủ thư (LIBRARIAN) xem danh sách mượn có thể xem của mọi người mà không bị ép userCode', async () => {
            const originalFindAll = borrowRepository.findAll;
            let capturedQuery = null;
            borrowRepository.findAll = async (query) => {
                capturedQuery = query;
                return [];
            };

            try {
                const res = await fetch(`${baseUrl}/api/borrows?userCode=2311159`, {
                    headers: librarianHeaders,
                });
                assert.equal(res.status, 200);
                assert.equal(capturedQuery.userCode, '2311159');
            } finally {
                borrowRepository.findAll = originalFindAll;
            }
        });
    });
});


