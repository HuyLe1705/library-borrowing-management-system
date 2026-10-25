const express = require('express');
const borrowRequestController = require('../controllers/borrowRequest.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /api/borrow-requests:
 *   post:
 *     summary: Độc giả tạo yêu cầu mượn sách (Borrow Request / Reservation)
 *     description: Độc giả (Sinh viên / Giảng viên) gửi yêu cầu đăng ký mượn 1 đầu sách qua hệ thống. Hệ thống tự động kiểm tra hạn mức, sách quá hạn và các khoản phạt chưa đóng trước khi tạo yêu cầu.
 *     tags: [BorrowRequests]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *             properties:
 *               bookId:
 *                 type: integer
 *                 example: 1
 *                 description: ID của đầu sách muốn mượn
 *               copyId:
 *                 type: integer
 *                 nullable: true
 *                 example: null
 *                 description: ID bản sao cụ thể (nếu có nhu cầu chọn bản sao)
 *               note:
 *                 type: string
 *                 example: "Cần mượn phục vụ bài tập lớn môn CNPM"
 *                 description: Ghi chú hoặc lý do mượn sách
 *               expectedPickupDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-30"
 *                 description: Ngày dự kiến đến thư viện nhận sách
 *     responses:
 *       201:
 *         description: Gửi yêu cầu mượn sách thành công.
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
 *                   example: "Gửi yêu cầu mượn sách thành công. Vui lòng chờ Thủ thư xử lý."
 *                 data:
 *                   $ref: '#/components/schemas/BorrowRequest'
 *       400:
 *         description: Thiếu thông tin hoặc độc giả đã đạt giới hạn mượn sách.
 *       403:
 *         description: Tài khoản bị khóa, nợ phạt hoặc có sách quá hạn.
 *       404:
 *         description: Không tìm thấy đầu sách.
 *       409:
 *         description: Đã có yêu cầu đang chờ cho cùng đầu sách này.
 *
 *   get:
 *     summary: Lấy danh sách yêu cầu mượn sách
 *     description: Độc giả xem danh sách yêu cầu của chính mình; Thủ thư/Admin xem danh sách toàn bộ yêu cầu trong thư viện (có hỗ trợ lọc theo trạng thái, người dùng, sách).
 *     tags: [BorrowRequests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, APPROVED, REJECTED, FULFILLED, CANCELLED]
 *         description: Lọc theo trạng thái yêu cầu
 *       - in: query
 *         name: userCode
 *         schema:
 *           type: string
 *         description: Lọc theo mã độc giả (chỉ áp dụng cho Thủ thư/Admin)
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: integer
 *         description: Lọc theo ID đầu sách
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Thành công.
 *
 * /api/borrow-requests/{id}:
 *   get:
 *     summary: Xem chi tiết một yêu cầu mượn sách theo ID
 *     tags: [BorrowRequests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của yêu cầu mượn
 *     responses:
 *       200:
 *         description: Thành công.
 *       404:
 *         description: Không tìm thấy yêu cầu.
 *
 * /api/borrow-requests/{id}/cancel:
 *   patch:
 *     summary: Độc giả tự hủy yêu cầu mượn sách đang chờ duyệt (PENDING)
 *     tags: [BorrowRequests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của yêu cầu mượn muốn hủy
 *     responses:
 *       200:
 *         description: Hủy yêu cầu thành công.
 *       400:
 *         description: Không thể hủy yêu cầu không ở trạng thái PENDING.
 *       403:
 *         description: Không có quyền hủy yêu cầu của người khác.
 *
 * /api/borrow-requests/{id}/status:
 *   patch:
 *     summary: Thủ thư / Admin duyệt hoặc từ chối yêu cầu mượn sách
 *     description: Cập nhật trạng thái yêu cầu sang APPROVED hoặc REJECTED kèm ghi chú và hạn chót đến lấy sách.
 *     tags: [BorrowRequests]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của yêu cầu mượn
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
 *                 enum: [APPROVED, REJECTED, FULFILLED]
 *                 example: "APPROVED"
 *               adminNote:
 *                 type: string
 *                 example: "Đã giữ sách tại quầy tầng 2, hạn lấy 3 ngày"
 *               copyId:
 *                 type: integer
 *                 example: 1
 *                 description: ID bản sao sách vật lý phân bổ
 *               pickupDeadline:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-28"
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công.
 *       403:
 *         description: Chỉ Thủ thư hoặc Quản trị viên mới có quyền cập nhật.
 *       404:
 *         description: Không tìm thấy yêu cầu.
 */

router.post('/', authenticate, authorize('STUDENT', 'LECTURER', 'LIBRARIAN', 'ADMIN'), borrowRequestController.createRequest);
router.get('/', authenticate, borrowRequestController.getRequests);
router.get('/:id', authenticate, borrowRequestController.getRequestById);
router.patch('/:id/cancel', authenticate, borrowRequestController.cancelRequest);
router.patch('/:id/status', authenticate, authorize('LIBRARIAN', 'ADMIN'), borrowRequestController.updateStatus);

module.exports = router;
