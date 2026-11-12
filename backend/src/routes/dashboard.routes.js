const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

/**
 * @openapi
 * /api/dashboard/summary:
 *   get:
 *     summary: Thống kê tổng quan Dashboard (Tổng số sách, độc giả, sách đang mượn và sách quá hạn)
 *     description: Trả về số liệu KPI tổng quan cho Thủ thư và Ban quản trị thư viện gồm tổng số đầu sách, tổng bản sao, số độc giả, số sách đang mượn, số sách quá hạn và tổng tiền phạt chưa thu.
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lấy thông tin tổng quan dashboard thành công.
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
 *                   example: "Lấy thông tin tổng quan dashboard thành công."
 *                 data:
 *                   $ref: '#/components/schemas/DashboardSummary'
 *       401:
 *         description: Chưa đăng nhập.
 *       403:
 *         description: Không có quyền truy cập (chỉ dành cho Thủ thư và Admin).
 *
 * /api/dashboard/statistics:
 *   get:
 *     summary: Thống kê số lượt mượn/trả theo ngày hoặc tháng để vẽ biểu đồ
 *     description: Cung cấp chuỗi dữ liệu (series) về số lượng lượt mượn (borrows) và lượt trả (returns) theo từng ngày hoặc từng tháng trong năm để Frontend render biểu đồ cột, biểu đồ đường (Line/Bar charts).
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, month]
 *           default: day
 *         description: "Chu kỳ thống kê: theo ngày (day) hoặc theo tháng (month)"
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           example: 2026
 *         description: "Năm cần thống kê (mặc định là năm hiện tại)"
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *           example: 10
 *         description: "Tháng cần xem chi tiết các ngày (khi period = day)"
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 7
 *           example: 7
 *         description: "Số ngày gần nhất cần thống kê (khi period = day và không truyền month)"
 *     responses:
 *       200:
 *         description: Lấy số liệu thống kê thành công.
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
 *                   example: "Lấy số liệu thống kê mượn trả thành công."
 *                 data:
 *                   $ref: '#/components/schemas/DashboardStatistics'
 *       400:
 *         description: Tham số period, year, month hoặc days không hợp lệ.
 *       401:
 *         description: Chưa đăng nhập.
 *       403:
 *         description: Không có quyền truy cập (chỉ dành cho Thủ thư và Admin).
 *
 * /api/dashboard/activities:
 *   get:
 *     summary: Lấy nhật ký hoạt động gần đây hiển thị trên Dashboard Feed
 *     tags: [Dashboard]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số lượng hoạt động gần nhất
 *     responses:
 *       200:
 *         description: Thành công.
 */

router.get('/summary', authenticate, authorize('LIBRARIAN', 'ADMIN'), dashboardController.getSummary);
router.get('/statistics', authenticate, authorize('LIBRARIAN', 'ADMIN'), dashboardController.getStatistics);
router.get('/activities', authenticate, authorize('LIBRARIAN', 'ADMIN'), dashboardController.getRecentActivities);

module.exports = router;
