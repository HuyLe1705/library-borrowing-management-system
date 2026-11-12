
import { apiRequest, unwrapData } from './apiClient';

const DASHBOARD_ENDPOINT = '/dashboard';

/**
 * Tổng quan:
 * - Tổng số đầu sách
 * - Tổng số bản sách
 * - Số phiếu mượn đang hoạt động
 * - Số sách quá hạn
 * - Số yêu cầu mượn chờ xử lý
 */
export async function getDashboardSummary() {
    const response = await apiRequest(`${DASHBOARD_ENDPOINT}/summary`);
    return unwrapData(response);
}

/**
 * Thống kê lượt mượn/trả theo khoảng thời gian.
 *
 * params ví dụ:
 * { from: '2026-10-01', to: '2026-10-31', groupBy: 'day' }
 */
export async function getBorrowingStatistics(params = {}) {
    const response = await apiRequest(
        `${DASHBOARD_ENDPOINT}/borrowing-statistics`,
        { params }
    );

    return unwrapData(response);
}

/**
 * Danh sách yêu cầu mượn đang chờ xử lý.
 */
export async function getPendingBorrowRequests(params = {}) {
    const response = await apiRequest('/borrow-requests', {
        params: {
            ...params,
            status: 'PENDING',
        },
    });

    return unwrapData(response);
}

/**
 * Danh sách sách quá hạn.
 */
export async function getOverdueBooks(params = {}) {
    const response = await apiRequest('/borrowings/overdue', {
        params,
    });

    return unwrapData(response);
}

const dashboardService = {
    getDashboardSummary,
    getBorrowingStatistics,
    getPendingBorrowRequests,
    getOverdueBooks,
};

export default dashboardService;
