const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const swaggerJsdoc = require('swagger-jsdoc');

const app = require('../src/app');
const bookRepository = require('../src/repositories/book.repository');
const categoryRepository = require('../src/repositories/category.repository');
const borrowRepository = require('../src/repositories/borrow.repository');

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
                headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
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
                assert.equal(capturedPayload.coverURL, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c');
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
                    headers: { 'Content-Type': 'application/json' },
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
                const res = await fetch(`${baseUrl}/api/books/1`, { method: 'DELETE' });
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
                headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
                    headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'Mã vạch sách (barcode) là bắt buộc khi trả sách.');
        });

        test('POST /api/borrows/:id/renew - Kiểm tra tính hợp lệ của ID phiếu mượn', async () => {
            const res = await fetch(`${baseUrl}/api/borrows/xyz/renew`, {
                method: 'POST',
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'ID phiếu mượn không hợp lệ.');
        });

        test('PATCH /api/borrows/fines/:id/pay - Kiểm tra tính hợp lệ của ID phiếu phạt', async () => {
            const res = await fetch(`${baseUrl}/api/borrows/fines/abc/pay`, {
                method: 'PATCH',
            });
            assert.equal(res.status, 400);
            const body = await res.json();
            assert.equal(body.message, 'ID phiếu phạt không hợp lệ.');
        });
    });
});
