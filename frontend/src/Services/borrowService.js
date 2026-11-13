import { apiRequest, unwrapData } from './apiClient';

/**
 * Tạo yêu cầu mượn sách.
 * POST /api/borrow-requests
 *
 * @param {Object} payload
 * @param {number|string} payload.bookId - ID sách
 * @param {number|string|null} payload.copyId - ID bản sao, có thể null
 * @param {string} payload.note - Ghi chú
 * @param {string} payload.expectedPickupDate - Ngày dự kiến nhận sách
 */
export async function createBorrowRequest(payload = {}) {
    const {
        bookId,
        copyId = null,
        note = '',
        expectedPickupDate,
    } = payload;

    if (bookId === undefined || bookId === null || bookId === '') {
        throw new Error('Không xác định được sách cần mượn.');
    }

    if (!expectedPickupDate) {
        throw new Error('Vui lòng chọn ngày dự kiến nhận sách.');
    }

    const response = await apiRequest('/borrow-requests', {
        method: 'POST',
        body: {
            bookId,
            copyId: copyId || null,
            note: String(note || '').trim(),
            expectedPickupDate,
        },
    });

    return unwrapData(response);
}

/**
 * Lấy danh sách yêu cầu mượn sách.
 * GET /api/borrow-requests
 *
 * Các bộ lọc được hỗ trợ:
 * - status: PENDING, APPROVED, REJECTED, FULFILLED, CANCELLED
 * - bookId
 * - userCode: chỉ dành cho thủ thư/quản trị viên
 * - page
 * - size
 *
 * Lưu ý: Backend phải tự giới hạn dữ liệu theo tài khoản
 * đăng nhập đối với độc giả.
 */
export async function getBorrowRequests(params = {}) {
    const response = await apiRequest('/borrow-requests', {
        method: 'GET',
        params: {
            page: 1,
            size: 20,
            ...params,
        },
    });

    return unwrapData(response);
}

/**
 * Lấy danh sách giao dịch mượn/trả sách.
 * GET /api/borrows
 *
 * Các bộ lọc được hỗ trợ:
 * - status: BORROWED, RETURNED, OVERDUE
 * - userCode: chỉ dành cho thủ thư/quản trị viên
 * - barcode
 *
 * Không tự truyền userCode của độc giả từ frontend.
 * Backend phải xác định độc giả hiện tại bằng token đăng nhập.
 */
export async function getBorrows(params = {}) {
    const response = await apiRequest('/borrows', {
        method: 'GET',
        params,
    });

    return unwrapData(response);
}

/**
 * Lấy các sách đang được mượn.
 * Bao gồm cả giao dịch quá hạn chưa trả.
 */
export async function getCurrentBorrows() {
    return getBorrows({
        status: 'BORROWED',
    });
}

/**
 * Lấy lịch sử các sách đã trả.
 */
export async function getReturnedBorrows() {
    return getBorrows({
        status: 'RETURNED',
    });
}