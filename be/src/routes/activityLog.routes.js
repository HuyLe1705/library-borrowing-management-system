const express = require('express');
const activityLogController = require('../controllers/activityLog.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /api/activity-logs:
 *   get:
 *     summary: Lấy danh sách nhật ký hoạt động hệ thống (Activity Logs)
 *     description: Lấy lịch sử các hành động trong hệ thống như mượn, trả, gia hạn sách, nộp phạt, yêu cầu mượn,... Có phân trang và bộ lọc theo loại hành động, mã người dùng, ngày tháng.
 *     tags: [ActivityLogs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang hiện tại
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số bản ghi mỗi trang (tối đa 100)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: "Lọc theo hành động (ví dụ: BORROW, RETURN, RENEW, PAY_FINE, BORROW_REQUEST)"
 *       - in: query
 *         name: userCode
 *         schema:
 *           type: string
 *         description: Lọc theo mã độc giả hoặc thủ thư
 *       - in: query
 *         name: targetType
 *         schema:
 *           type: string
 *         description: "Loại đối tượng (ví dụ: BORROW_RECORD, BOOK_COPY, FINE, BORROW_REQUEST)"
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: "Lọc từ ngày (YYYY-MM-DD)"
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: "Lọc đến ngày (YYYY-MM-DD)"
 *     responses:
 *       200:
 *         description: Lấy danh sách nhật ký hoạt động thành công.
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
 *                   example: "Lấy danh sách nhật ký hoạt động thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ActivityLog'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Chưa xác thực token.
 *       403:
 *         description: Không có quyền truy cập (chỉ dành cho Thủ thư và Admin).
 *
 *   post:
 *     summary: Ghi một nhật ký hoạt động mới (thủ công)
 *     description: Cho phép client hoặc webhook gửi sự kiện hoạt động cần ghi nhận vào hệ thống.
 *     tags: [ActivityLogs]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 example: "SEARCH_CATALOG"
 *                 description: Tên mã hành động
 *               targetType:
 *                 type: string
 *                 example: "BOOK"
 *                 description: Loại đối tượng tác động
 *               targetId:
 *                 type: integer
 *                 example: 1
 *                 description: ID đối tượng tác động
 *               details:
 *                 type: string
 *                 example: "Tìm kiếm sách theo từ khóa Clean Code"
 *                 description: Chi tiết mô tả hoạt động
 *     responses:
 *       201:
 *         description: Ghi nhật ký hoạt động thành công.
 *       400:
 *         description: Thiếu thông tin bắt buộc.
 *
 * /api/activity-logs/recent:
 *   get:
 *     summary: Lấy danh sách hoạt động gần đây nhất
 *     description: Lấy danh sách các hoạt động vừa diễn ra để hiển thị trên Activity Feed của Dashboard.
 *     tags: [ActivityLogs]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng bản ghi gần nhất (tối đa 50)
 *     responses:
 *       200:
 *         description: Thành công.
 */

router.get('/', authenticate, authorize('LIBRARIAN', 'ADMIN'), activityLogController.getLogs);
router.post('/', authenticate, activityLogController.createLog);
router.get('/recent', authenticate, authorize('LIBRARIAN', 'ADMIN'), activityLogController.getRecent);

module.exports = router;
