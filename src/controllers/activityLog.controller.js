const activityLogService = require('../services/activityLog.service');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const activityLogController = {
    // Lấy danh sách nhật ký hoạt động
    getLogs: asyncHandler(async (req, res) => {
        const result = await activityLogService.getLogs(req.query);
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách nhật ký hoạt động thành công.',
            data: result,
        });
    }),

    // Ghi một nhật ký hoạt động mới (thủ công từ client hoặc webhook)
    createLog: asyncHandler(async (req, res) => {
        const { action, targetType, targetId, details } = req.body;
        if (!action) {
            throw new HttpError(400, 'Hành động (action) không được để trống.');
        }

        const log = await activityLogService.log({
            action,
            user: req.user,
            targetType,
            targetId,
            details,
            ipAddress: req.ip || req.headers['x-forwarded-for'],
        });

        res.status(201).json({
            success: true,
            message: 'Ghi nhật ký hoạt động thành công.',
            data: log,
        });
    }),

    // Lấy hoạt động gần đây (cho dashboard feed)
    getRecent: asyncHandler(async (req, res) => {
        const limit = req.query.limit || 10;
        const result = await activityLogService.getRecentLogs(limit);
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách hoạt động gần đây thành công.',
            data: result,
        });
    }),
};

module.exports = activityLogController;
