const express = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: API Xác thực và phân quyền tài khoản (Đăng ký, Đăng nhập, Thông tin người dùng)
 */

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới cho bạn đọc (Sinh viên / Giảng viên)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - fullName
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 example: "nguyen.an"
 *                 description: "Tên đăng nhập (tối thiểu 3 ký tự, duy nhất)"
 *               password:
 *                 type: string
 *                 example: "123456"
 *                 description: "Mật khẩu tài khoản (tối thiểu 6 ký tự)"
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn An"
 *                 description: "Họ và tên đầy đủ"
 *               email:
 *                 type: string
 *                 example: "an.nguyen@hcmut.edu.vn"
 *                 description: "Địa chỉ email (duy nhất)"
 *               userCode:
 *                 type: string
 *                 example: "2311999"
 *                 description: "Mã độc giả / MSSV (tự sinh nếu bỏ trống)"
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *                 description: "Số điện thoại liên hệ"
 *               role:
 *                 type: string
 *                 enum: [STUDENT, LECTURER, LIBRARIAN, ADMIN]
 *                 default: STUDENT
 *                 description: "Vai trò người dùng (STUDENT, LECTURER, LIBRARIAN, ADMIN - mặc định STUDENT)"
 *     responses:
 *       201:
 *         description: Đăng ký tài khoản thành công, trả về JWT Token và thông tin người dùng.
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
 *                   example: "Đăng ký tài khoản thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *       400:
 *         description: Thông tin đăng ký không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Tên đăng nhập, email hoặc MSSV đã tồn tại.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập hệ thống thư viện (Hỗ trợ Sinh viên, Giảng viên, Thủ thư, Admin)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "admin"
 *                 description: "Tên đăng nhập, mã độc giả (MSSV) hoặc email"
 *               password:
 *                 type: string
 *                 example: "123456"
 *                 description: "Mật khẩu của tài khoản (mặc định môi trường dev: 'hashed_pw', '123456', hoặc username)"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về JWT Token và thông tin người dùng.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *               success:
 *                 type: boolean
 *                 example: true
 *               message:
 *                 type: string
 *                 example: "Đăng nhập thành công."
 *               data:
 *                 type: object
 *                 properties:
 *                   token:
 *                     type: string
 *                     example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       userCode:
 *                         type: string
 *                         example: "ADMIN01"
 *                       username:
 *                         type: string
 *                         example: "admin"
 *                       fullName:
 *                         type: string
 *                         example: "Quản Trị Viên"
 *                       email:
 *                         type: string
 *                         example: "admin@hcmut.edu.vn"
 *                       phone:
 *                         type: string
 *                         example: "0901000001"
 *                       role:
 *                         type: string
 *                         example: "ADMIN"
 *                       status:
 *                         type: string
 *                         example: "ACTIVE"
 *       400:
 *         description: Thiếu tên đăng nhập hoặc mật khẩu.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Thông tin đăng nhập không chính xác.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Tài khoản đã bị khóa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin tài khoản đang đăng nhập hiện tại
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin tài khoản thành công.
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
 *                   example: "Lấy thông tin tài khoản thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     userCode:
 *                       type: string
 *                       example: "ADMIN01"
 *                     username:
 *                       type: string
 *                       example: "admin"
 *                     fullName:
 *                       type: string
 *                       example: "Quản Trị Viên"
 *                     email:
 *                       type: string
 *                       example: "admin@hcmut.edu.vn"
 *                     phone:
 *                       type: string
 *                       example: "0901000001"
 *                     role:
 *                       type: string
 *                       example: "ADMIN"
 *                     status:
 *                       type: string
 *                       example: "ACTIVE"
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/me', authenticate, authController.getMe);

module.exports = router;
