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
 *     summary: Lấy danh sách toàn bộ sách
 *     tags: [Books]
 *     responses:
 *       200:
 *         description: Trả về danh sách sách thành công.
 *   post:
 *     summary: Thêm một cuốn sách mới
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
 *                 example: "Lập trình Node.js cơ bản"
 *               author:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               categoryId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Tạo sách mới thành công.
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
 *           type: string
 *         description: ID của cuốn sách cần tìm
 *     responses:
 *       200:
 *         description: Tìm thấy thông tin sách.
 *       404:
 *         description: Không tìm thấy sách với ID đã cung cấp.
 *   put:
 *     summary: Cập nhật thông tin cuốn sách
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
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
 *               author:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công.
 *   delete:
 *     summary: Xóa một cuốn sách khỏi hệ thống
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của cuốn sách cần xóa
 *     responses:
 *       200:
 *         description: Xóa sách thành công.
 */
router.get('/:id', bookController.getBookById);
router.put('/:id', bookController.updateBook);
router.delete('/:id', bookController.deleteBook);

module.exports = router;
