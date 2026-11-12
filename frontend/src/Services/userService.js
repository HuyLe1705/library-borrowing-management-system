import { apiRequest, unwrapData } from './apiClient';

const USERS_ENDPOINT = '/users';

/**
 * Lấy danh sách người dùng.
 *
 * params có thể gồm các tham số lọc hoặc phân trang
 * nếu backend hỗ trợ.
 */
export async function getUsers(params = {}) {
    const response = await apiRequest(USERS_ENDPOINT, { params });
    return unwrapData(response);
}

/**
 * Lấy thông tin chi tiết người dùng theo ID.
 */
export async function getUserById(id) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID người dùng.');
    }

    const response = await apiRequest(
        `${USERS_ENDPOINT}/${encodeURIComponent(id)}`
    );

    return unwrapData(response);
}

/**
 * Cập nhật vai trò người dùng.
 *
 * Endpoint hiện được sử dụng trong UserManagement.jsx:
 * PATCH /users/{id}/role
 *
 * payload: { role: 'ADMIN' | 'USER' | 'LIBRARIAN' }
 */
export async function updateUserRole(id, role) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID người dùng cần cập nhật.');
    }

    if (!role || typeof role !== 'string') {
        throw new Error('Vai trò người dùng không hợp lệ.');
    }

    const response = await apiRequest(
        `${USERS_ENDPOINT}/${encodeURIComponent(id)}/role`,
        {
            method: 'PATCH',
            body: { role },
        }
    );

    return unwrapData(response);
}

/**
 * Tạo người dùng mới.
 *
 * payload phải tuân theo schema của backend.
 */
export async function createUser(payload) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Dữ liệu người dùng không hợp lệ.');
    }

    const response = await apiRequest(USERS_ENDPOINT, {
        method: 'POST',
        body: payload,
    });

    return unwrapData(response);
}

/**
 * Cập nhật thông tin người dùng.
 *
 * Mặc định sử dụng PUT /users/{id}.
 * Chỉ sử dụng nếu backend hỗ trợ endpoint này.
 */
export async function updateUser(id, payload) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID người dùng cần cập nhật.');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('Dữ liệu người dùng không hợp lệ.');
    }

    const response = await apiRequest(
        `${USERS_ENDPOINT}/${encodeURIComponent(id)}`,
        {
            method: 'PUT',
            body: payload,
        }
    );

    return unwrapData(response);
}

/**
 * Xóa người dùng.
 *
 * Chỉ sử dụng nếu backend hỗ trợ endpoint này.
 */
export async function deleteUser(id) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID người dùng cần xóa.');
    }

    const response = await apiRequest(
        `${USERS_ENDPOINT}/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
    );

    return unwrapData(response);
}

const userService = {
    getUsers,
    getUserById,
    updateUserRole,
    createUser,
    updateUser,
    deleteUser,
};

export default userService;