const express = require('express');
const bookController = require('../controllers/book.controller');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Books
 *   description: API Quản lý sách trong thư viện
 */

/**
 * @openapi
 * /api/books:
 *   get:
 *     summary: Lấy danh sách toàn bộ sách (hỗ trợ tìm kiếm, lọc và phân trang)
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang hiện tại (bắt đầu từ 1)
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng sách trên một trang (từ 1 đến 100)
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo Tiêu đề, ISBN hoặc Tác giả
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Lọc chính xác theo tên thể loại
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: Lọc theo năm xuất bản
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [title, year, author]
 *           default: title
 *         description: Tiêu chí sắp xếp danh sách sách
 *     responses:
 *       200:
 *         description: Trả về danh sách sách và thông tin phân trang thành công.
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
 *                   example: "Lấy danh sách sách thành công."
 *                 data:
 *                   $ref: '#/components/schemas/PaginatedBooks'
 *       400:
 *         description: Tham số phân trang hoặc lọc không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Thêm một cuốn sách mới (ID được CSDL tự động tăng, không truyền ID)
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Clean Architecture: A Craftsman's Guide"
 *                 description: "Tên sách (bắt buộc)"
 *               isbn:
 *                 type: string
 *                 example: "978-0134494166"
 *                 description: "Mã ISBN duy nhất của sách"
 *               author:
 *                 type: string
 *                 example: "Robert C. Martin"
 *                 description: "Tác giả cuốn sách"
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *                 description: "ID thể loại sách (tham chiếu bảng categories)"
 *               publisher:
 *                 type: string
 *                 example: "Prentice Hall"
 *               year:
 *                 type: integer
 *                 example: 2017
 *               language:
 *                 type: string
 *                 example: "Tiếng Anh"
 *               description:
 *                 type: string
 *                 example: "Hướng dẫn thực hành kiến trúc phần mềm sạch và bền vững"
 *               coverUrl:
 *                 type: string
 *                 example: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c"
 *                 description: "Đường link URL ảnh bìa sách từ Internet để giao diện web/app hiển thị"
 *               shelfLocation:
 *                 type: string
 *                 example: "Kệ CNPM - Tầng 2 - Ô A3"
 *                 description: "Vị trí kệ sách khi tạo bản sao sách ban đầu"
 *               barcode:
 *                 type: string
 *                 example: "BC-CA-001"
 *                 description: "Mã vạch bản sao vật lý ban đầu (tùy chọn)"
 *     responses:
 *       201:
 *         description: Tạo sách mới thành công.
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
 *                   example: "Thêm sách thành công."
 *                 data:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Dữ liệu sách hoặc thể loại không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Mã ISBN đã tồn tại trong hệ thống.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', bookController.getBooks);
router.post('/', bookController.createBook);

/**
 * @openapi
 * /api/books/{id}:
 *   get:
 *     summary: Lấy thông tin chi tiết một cuốn sách bằng ID
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của cuốn sách cần xem chi tiết
 *     responses:
 *       200:
 *         description: Tìm thấy thông tin chi tiết sách và danh sách bản sao vật lý.
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
 *                   example: "Lấy chi tiết sách thành công."
 *                 data:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: ID sách không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy sách với ID đã cung cấp.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Cập nhật thông tin cuốn sách
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của cuốn sách cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Software Engineering (Updated Edition)"
 *               isbn:
 *                 type: string
 *                 example: "978-0133943030"
 *               author:
 *                 type: string
 *                 example: "Ian Sommerville"
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *               publisher:
 *                 type: string
 *                 example: "Pearson Education"
 *               year:
 *                 type: integer
 *                 example: 2021
 *               language:
 *                 type: string
 *                 example: "Tiếng Việt"
 *               description:
 *                 type: string
 *                 example: "Cập nhật các nội dung mới về Agile và DevOps"
 *               coverUrl:
 *                 type: string
 *                 example: "https://images.unsplash.com/photo-1532012164546-f432f2e3777a"
 *                 description: "URL ảnh bìa sách trực tuyến"
 *     responses:
 *       200:
 *         description: Cập nhật thông tin sách thành công.
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
 *                   example: "Cập nhật sách thành công."
 *                 data:
 *                   $ref: '#/components/schemas/Book'
 *       400:
 *         description: Dữ liệu sách cập nhật không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy sách để cập nhật.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Mã ISBN đã được sử dụng cho một cuốn sách khác.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Xóa một cuốn sách khỏi hệ thống (có kiểm tra ràng buộc mượn trả)
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của cuốn sách cần xóa
 *     responses:
 *       200:
 *         description: Xóa sách thành công.
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
 *                   example: "Xóa sách thành công."
 *       400:
 *         description: ID sách không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy sách để xóa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Không thể xóa vì sách đang được mượn hoặc đã phát sinh lịch sử giao dịch.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', bookController.getBookById);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

module.exports = router;
