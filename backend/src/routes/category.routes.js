const express = require('express');
const categoryController = require('../controllers/category.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Lấy danh sách tất cả danh mục sách (có hỗ trợ tìm kiếm)
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tên hoặc mô tả thể loại
 *     responses:
 *       200:
 *         description: Lấy danh sách danh mục thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Category'
 *   post:
 *     summary: Tạo một danh mục sách mới (ID được CSDL tự tăng IDENTITY, không truyền ID)
 *     tags: [Categories]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Khoa học máy tính"
 *                 description: "Tên danh mục (bắt buộc, duy nhất)"
 *               description:
 *                 type: string
 *                 example: "Sách nghiên cứu về thuật toán, cấu trúc dữ liệu và lý thuyết tính toán"
 *                 description: "Mô tả chi tiết thể loại"
 *     responses:
 *       201:
 *         description: Tạo danh mục thành công.
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
 *                   example: "Tạo danh mục thành công."
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Tên danh mục không được để trống.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Danh mục đã tồn tại trong hệ thống.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', categoryController.getCategories);
router.post('/', authenticate, authorize('LIBRARIAN', 'ADMIN'), categoryController.createCategory);

/**
 * @openapi
 * /api/categories/{name}:
 *   get:
 *     summary: Lấy thông tin chi tiết danh mục theo tên
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên danh mục cần tìm kiếm
 *         example: "Công nghệ phần mềm"
 *     responses:
 *       200:
 *         description: Tìm thấy thông tin danh mục.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       404:
 *         description: Không tìm thấy danh mục.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Cập nhật thông tin danh mục theo tên
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên danh mục hiện tại cần chỉnh sửa
 *         example: "Khoa học máy tính"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Khoa học Dữ liệu & Máy tính"
 *                 description: "Tên mới của danh mục"
 *               description:
 *                 type: string
 *                 example: "Cập nhật mô tả thể loại"
 *     responses:
 *       200:
 *         description: Cập nhật danh mục thành công.
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
 *                   example: "Cập nhật danh mục thành công."
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Tên danh mục không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy danh mục cần cập nhật.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Tên danh mục mới đã tồn tại.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Xóa một danh mục theo tên (chặn xóa nếu đang có sách thuộc thể loại)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên danh mục cần xóa
 *         example: "Khoa học Dữ liệu & Máy tính"
 *     responses:
 *       200:
 *         description: Xóa danh mục thành công.
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
 *                   example: "Xóa danh mục thành công."
 *       404:
 *         description: Không tìm thấy danh mục cần xóa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Không thể xóa danh mục đang được sách sử dụng.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:name', categoryController.getCategoryByName);
router.put('/:name', authenticate, authorize('LIBRARIAN', 'ADMIN'), categoryController.updateCategory);
router.delete('/:name', authenticate, authorize('LIBRARIAN', 'ADMIN'), categoryController.deleteCategory);

module.exports = router;
