const dashboardRepository = require('../repositories/dashboard.repository');
const activityLogService = require('./activityLog.service');
const HttpError = require('../utils/httpError');

const dashboardService = {
    // Lấy thông tin tổng quan dashboard (tổng số sách, độc giả, sách đang mượn, sách quá hạn)
    async getSummary() {
        return dashboardRepository.getSummary();
    },

    // Thống kê số lượt mượn/trả theo ngày hoặc tháng để FE vẽ biểu đồ
    async getStatistics(query = {}) {
        let period = 'day';
        if (query.period) {
            const p = String(query.period).toLowerCase().trim();
            if (p === 'month' || p === 'monthly') {
                period = 'month';
            } else if (p === 'day' || p === 'daily') {
                period = 'day';
            } else {
                throw new HttpError(400, 'Tham số period không hợp lệ. Chỉ chấp nhận: day, month.');
            }
        }

        let year = query.year ? Number(query.year) : undefined;
        if (year !== undefined && (isNaN(year) || year < 1900 || year > 2100)) {
            throw new HttpError(400, 'Năm (year) không hợp lệ.');
        }

        let month = query.month ? Number(query.month) : undefined;
        if (month !== undefined && (isNaN(month) || month < 1 || month > 12)) {
            throw new HttpError(400, 'Tháng (month) phải từ 1 đến 12.');
        }

        let days = query.days ? Number(query.days) : 7;
        if (days !== undefined && (isNaN(days) || days < 1 || days > 60)) {
            throw new HttpError(400, 'Số ngày (days) phải từ 1 đến 60.');
        }

        return dashboardRepository.getStatistics({ period, year, month, days });
    },

    // Lấy các hoạt động gần nhất phục vụ feed trên dashboard
    async getRecentActivities(limit = 10) {
        return activityLogService.getRecentLogs(limit);
    },
};

module.exports = dashboardService;
