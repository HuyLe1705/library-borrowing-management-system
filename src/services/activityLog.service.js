const activityLogRepository = require('../repositories/activityLog.repository');
const HttpError = require('../utils/httpError');

const activityLogService = {
    // Ghi nhận một hoạt động mới vào hệ thống (không throw lỗi ra ngoài để bảo đảm nghiệp vụ chính không bị ngắt)
    async log({ action, user, userId, userCode, userName, userRole, targetType, targetId, details, ipAddress }) {
        if (!action) return null;

        const effectiveUserId = user?.id || userId || null;
        const effectiveUserCode = user?.userCode || userCode || null;
        const effectiveUserName = user?.fullName || user?.username || userName || null;
        const effectiveUserRole = user?.role || userRole || null;

        return activityLogRepository.create({
            action: String(action).toUpperCase(),
            userId: effectiveUserId,
            userCode: effectiveUserCode,
            userName: effectiveUserName,
            userRole: effectiveUserRole,
            targetType: targetType ? String(targetType).toUpperCase() : null,
            targetId: targetId ? Number(targetId) : null,
            details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
            ipAddress: ipAddress || null,
        });
    },

    // Lấy danh sách activity logs có phân trang
    async getLogs(query = {}) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const size = Math.min(100, Math.max(1, parseInt(query.size, 10) || 20));

        if (query.page && isNaN(parseInt(query.page, 10))) {
            throw new HttpError(400, 'Tham số page phải là số nguyên dương.');
        }

        if (query.size && (isNaN(parseInt(query.size, 10)) || parseInt(query.size, 10) > 100)) {
            throw new HttpError(400, 'Tham số size không hợp lệ (tối đa 100).');
        }

        return activityLogRepository.findAll({
            page,
            size,
            action: query.action,
            userCode: query.userCode,
            targetType: query.targetType,
            from: query.from,
            to: query.to,
        });
    },

    // Lấy N hoạt động gần nhất
    async getRecentLogs(limit = 10) {
        const safeLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
        return activityLogRepository.getRecent(safeLimit);
    },
};

module.exports = activityLogService;
