const express = require('express');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

/**
 * @openapi
 * /api/categories:
 *   get:
 *     summary: Lấy danh sách tất cả danh mục sách
 *     tags: [Categories]
 */
router.get('/', categoryController.getCategories);

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
 */
router.get('/:name', categoryController.getCategoryByName);

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Tạo một danh mục sách mới
 *     tags: [Categories]
 */
router.post('/', categoryController.createCategory);

/**
 * @openapi
 * /api/categories/{name}:
 *   put:
 *     summary: Cập nhật thông tin danh mục theo tên
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên danh mục cần cập nhật
 */
router.put('/:name', categoryController.updateCategory);

/**
 * @openapi
 * /api/categories/{name}:
 *   delete:
 *     summary: Xóa một danh mục theo tên
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Tên danh mục cần xóa
 */
router.delete('/:name', categoryController.deleteCategory);

module.exports = router;
