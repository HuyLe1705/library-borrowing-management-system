import { apiRequest, unwrapData } from './apiClient';

const ACTIVITY_LOGS_ENDPOINT = '/activity-logs';

/**
 * Lấy danh sách nhật ký hoạt động.
 *
 * params có thể gồm các tham số lọc hoặc phân trang
 * nếu backend hỗ trợ.
 */
export async function getActivityLogs(params = {}) {
    const response = await apiRequest(ACTIVITY_LOGS_ENDPOINT, {
        params,
    });

    return unwrapData(response);
}

/**
 * Lấy danh sách hoạt động gần đây nhất.
 */
export async function getRecentActivityLogs(params = {}) {
    const response = await apiRequest(
        `${ACTIVITY_LOGS_ENDPOINT}/recent`,
        { params }
    );

    return unwrapData(response);
}

/**
 * Ghi một nhật ký hoạt động mới theo yêu cầu thủ công.
 *
 * payload phải tuân theo schema của backend.
 */
export async function createActivityLog(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Dữ liệu nhật ký hoạt động không hợp lệ.');
    }

    const response = await apiRequest(ACTIVITY_LOGS_ENDPOINT, {
        method: 'POST',
        body: payload,
    });

    return unwrapData(response);
}

const activityLogService = {
    getActivityLogs,
    getRecentActivityLogs,
    createActivityLog,
};

export default activityLogService;