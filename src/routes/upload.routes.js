const express = require('express');
const upload = require('../middlewares/upload.middleware');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

// Middleware hỗ trợ nhận linh hoạt field name: 'image', 'file', hoặc 'cover'
const uploadImageMiddleware = (req, res, next) => {
    const handler = upload.fields([
        { name: 'image', maxCount: 1 },
        { name: 'file', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
    ]);

    handler(req, res, (err) => {
        if (err) return next(err);
        if (req.files) {
            req.file = req.files.image?.[0] || req.files.file?.[0] || req.files.cover?.[0] || null;
        }
        next();
    });
};

/**
 * @openapi
 * tags:
 *   name: Upload
 *   description: API Tải tệp tin ảnh lên máy chủ cục bộ (Local Storage)
 */

/**
 * @openapi
 * /api/upload:
 *   post:
 *     summary: Tải ảnh bìa sách lên máy chủ (Hỗ trợ JPG, PNG, WEBP, GIF tối đa 5MB)
 *     tags: [Upload]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "File ảnh cần tải lên từ thiết bị (chấp nhận key: 'image', 'file' hoặc 'cover')"
 *     responses:
 *       201:
 *         description: Tải ảnh lên thành công, trả về đường link ảnh truy cập trực tiếp.
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
 *                   example: "Tải ảnh lên máy chủ thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     filename:
 *                       type: string
 *                       example: "book-1729524000000-123456789.jpg"
 *                     coverUrl:
 *                       type: string
 *                       example: "http://localhost:5000/uploads/book-1729524000000-123456789.jpg"
 *                     url:
 *                       type: string
 *                       example: "http://localhost:5000/uploads/book-1729524000000-123456789.jpg"
 *                     size:
 *                       type: integer
 *                       example: 245100
 *                     mimetype:
 *                       type: string
 *                       example: "image/jpeg"
 *       400:
 *         description: Chưa chọn file hoặc file không đúng định dạng ảnh.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', uploadImageMiddleware, uploadController.uploadImage);

module.exports = router;
