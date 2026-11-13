const express = require('express');
const userController = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * tags:
 *   name: Users
 *   description: API Quản lý người dùng (Thêm, Xóa, Sửa, Đổi Role, Đổi Status, Tra cứu độc giả và nhân sự)
 */

/**
 * @openapi
 * /api/users:
 *   get:
 *     summary: Lấy danh sách người dùng (hỗ trợ tìm kiếm, lọc theo vai trò, trạng thái và phân trang)
 *     description: Cho phép Thủ thư (LIBRARIAN) và Quản trị viên (ADMIN) tra cứu danh sách bạn đọc và tài khoản trong hệ thống.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
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
 *         description: Số lượng kết quả trên một trang (tối đa 100)
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo Họ tên, Mã người dùng (MSSV), Username, Email hoặc Số điện thoại
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [STUDENT, LECTURER, LIBRARIAN, ADMIN]
 *         description: Lọc theo vai trò người dùng
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, LOCKED]
 *         description: Lọc theo trạng thái tài khoản
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, fullName, username, userCode, role, status]
 *           default: createdAt
 *         description: Tiêu chí sắp xếp danh sách
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: DESC
 *         description: Chiều sắp xếp (tăng dần hoặc giảm dần)
 *     responses:
 *       200:
 *         description: Lấy danh sách người dùng thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/PaginatedUsers'
 *       400:
 *         description: Tham số phân trang hoặc lọc không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Chưa đăng nhập hoặc token không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Bạn không có quyền truy cập (chỉ dành cho LIBRARIAN và ADMIN).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   post:
 *     summary: Thêm người dùng mới vào hệ thống (Chỉ ADMIN)
 *     description: Tạo mới tài khoản độc giả (Sinh viên / Giảng viên) hoặc tài khoản cán bộ thư viện / quản trị viên.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
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
 *               userCode:
 *                 type: string
 *                 example: "SV2026001"
 *                 description: Mã số độc giả / MSSV / Mã nhân viên (tự sinh nếu để trống)
 *               username:
 *                 type: string
 *                 example: "nguyen.van.a"
 *                 description: Tên đăng nhập (tối thiểu 3 ký tự, duy nhất)
 *               password:
 *                 type: string
 *                 example: "123456"
 *                 description: Mật khẩu khởi tạo (tối thiểu 6 ký tự)
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *                 description: Họ và tên đầy đủ
 *               email:
 *                 type: string
 *                 example: "vana.nguyen@example.com"
 *                 description: Địa chỉ email (duy nhất)
 *               phone:
 *                 type: string
 *                 example: "0901234567"
 *                 description: Số điện thoại liên hệ
 *               role:
 *                 type: string
 *                 enum: [STUDENT, LECTURER, LIBRARIAN, ADMIN]
 *                 default: STUDENT
 *                 description: Vai trò người dùng
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED]
 *                 default: ACTIVE
 *                 description: Trạng thái tài khoản ban đầu
 *     responses:
 *       201:
 *         description: Tạo người dùng mới thành công.
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
 *                   example: "Tạo người dùng mới thành công."
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Dữ liệu nhập vào không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Trùng lặp username, email hoặc userCode.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authenticate, authorize('ADMIN', 'LIBRARIAN'), userController.getUsers);
router.post('/', authenticate, authorize('ADMIN'), userController.createUser);

/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     summary: Xem thông tin chi tiết một người dùng
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     responses:
 *       200:
 *         description: Tìm thấy thông tin chi tiết người dùng.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: Không tìm thấy người dùng.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   put:
 *     summary: Cập nhật thông tin người dùng (Chỉ ADMIN)
 *     description: Sửa thông tin cá nhân, liên hệ, mã độc giả, mật khẩu hoặc vai trò của người dùng.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng cần cập nhật
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn A (Cập nhật)"
 *               email:
 *                 type: string
 *                 example: "vana.updated@example.com"
 *               phone:
 *                 type: string
 *                 example: "0988776655"
 *               userCode:
 *                 type: string
 *                 example: "SV2026999"
 *               password:
 *                 type: string
 *                 example: "newpassword123"
 *                 description: Mật khẩu mới nếu muốn đổi (tối thiểu 6 ký tự)
 *               role:
 *                 type: string
 *                 enum: [STUDENT, LECTURER, LIBRARIAN, ADMIN]
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED]
 *     responses:
 *       200:
 *         description: Cập nhật thông tin người dùng thành công.
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
 *                   example: "Cập nhật thông tin người dùng thành công."
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Dữ liệu cập nhật không hợp lệ.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy người dùng để cập nhật.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Email hoặc mã người dùng bị trùng với tài khoản khác.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *   delete:
 *     summary: Xóa người dùng khỏi hệ thống (Chỉ ADMIN)
 *     description: Xóa tài khoản người dùng khi chưa có ràng buộc lịch sử mượn trả sách hoặc tiền phạt.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng cần xóa
 *     responses:
 *       200:
 *         description: Xóa người dùng thành công.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Không thể tự xóa tài khoản chính mình hoặc người dùng đang mượn sách / chưa đóng phạt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy người dùng để xóa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Không thể xóa do đã có dữ liệu lịch sử mượn trả sách (yêu cầu chuyển sang LOCKED).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', authenticate, authorize('ADMIN', 'LIBRARIAN'), userController.getUserById);
router.put('/:id', authenticate, authorize('ADMIN'), userController.updateUser);
router.patch('/:id', authenticate, authorize('ADMIN'), userController.updateUser);
router.delete('/:id', authenticate, authorize('ADMIN'), userController.deleteUser);

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     summary: Đổi vai trò (Role) của người dùng (Chỉ ADMIN)
 *     description: Cập nhật vai trò phân quyền hệ thống (STUDENT, LECTURER, LIBRARIAN, ADMIN).
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [STUDENT, LECTURER, LIBRARIAN, ADMIN]
 *                 example: "LIBRARIAN"
 *                 description: Vai trò mới cần gán cho người dùng
 *     responses:
 *       200:
 *         description: Thay đổi vai trò người dùng thành công.
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
 *                   example: "Thay đổi vai trò người dùng thành công."
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Vai trò không hợp lệ hoặc Admin cố tình tự hạ quyền chính mình.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy người dùng.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/role', authenticate, authorize('ADMIN'), userController.changeRole);

/**
 * @openapi
 * /api/users/{id}/status:
 *   patch:
 *     summary: Đổi trạng thái tài khoản (Status) của người dùng (Khóa / Kích hoạt)
 *     description: Cho phép ADMIN và LIBRARIAN đổi trạng thái tài khoản (ACTIVE, LOCKED) khi độc giả vi phạm quy định thư viện.
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của người dùng
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, LOCKED]
 *                 example: "LOCKED"
 *                 description: Trạng thái tài khoản mới
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái tài khoản thành công.
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
 *                   example: "Thay đổi trạng thái tài khoản thành công."
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Trạng thái không hợp lệ hoặc Admin tự khóa tài khoản chính mình.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy người dùng.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/status', authenticate, authorize('ADMIN', 'LIBRARIAN'), userController.changeStatus);

module.exports = router;
