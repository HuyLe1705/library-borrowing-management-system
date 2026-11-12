const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');

const dashboardController = {
    // GET /api/dashboard/summary
    getSummary: asyncHandler(async (req, res) => {
        const data = await dashboardService.getSummary();
        res.status(200).json({
            success: true,
            message: 'Lấy thông tin tổng quan dashboard thành công.',
            data,
        });
    }),

    // GET /api/dashboard/statistics
    getStatistics: asyncHandler(async (req, res) => {
        const data = await dashboardService.getStatistics(req.query);
        res.status(200).json({
            success: true,
            message: 'Lấy số liệu thống kê mượn trả thành công.',
            data,
        });
    }),

    // GET /api/dashboard/activities
    getRecentActivities: asyncHandler(async (req, res) => {
        const limit = req.query.limit || 10;
        const data = await dashboardService.getRecentActivities(limit);
        res.status(200).json({
            success: true,
            message: 'Lấy nhật ký hoạt động gần đây thành công.',
            data,
        });
    }),
};

module.exports = dashboardController;
