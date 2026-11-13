
import { apiRequest, unwrapData } from './apiClient';

const BOOKS_ENDPOINT = '/books';

/**
 * Lấy danh sách sách.
 *
 * params có thể gồm:
 * { keyword, category, year, availability, page, size, sort }
 */

export async function getBooks(params = {}) {
    const response = await apiRequest(BOOKS_ENDPOINT, { params });
    return unwrapData(response);
}

/**
 * Tìm kiếm sách.
 * Dùng endpoint danh sách nếu backend hỗ trợ lọc bằng query params.
 */
export async function searchBooks(keyword, filters = {}) {
    return getBooks({
        ...filters,
        keyword: keyword?.trim() || undefined,
    });
}

/**
 * Lấy chi tiết một đầu sách theo ID.
 */
export async function getBookById(id) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID sách.');
    }

    const response = await apiRequest(
        `${BOOKS_ENDPOINT}/${encodeURIComponent(id)}`
    );

    return unwrapData(response);
}

/**
 * Thêm đầu sách mới.
 */
export async function createBook(bookData) {
    const response = await apiRequest(BOOKS_ENDPOINT, {
        method: 'POST',
        body: bookData,
    });

    return unwrapData(response);
}

/**
 * Cập nhật thông tin đầu sách.
 */
export async function updateBook(id, bookData) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID sách cần cập nhật.');
    }

    const response = await apiRequest(
        `${BOOKS_ENDPOINT}/${encodeURIComponent(id)}`,
        {
            method: 'PUT',
            body: bookData,
        }
    );

    return unwrapData(response);
}

/**
 * Xóa đầu sách.
 */
export async function deleteBook(id) {
    if (id === undefined || id === null || id === '') {
        throw new Error('Thiếu ID sách cần xóa.');
    }

    return apiRequest(
        `${BOOKS_ENDPOINT}/${encodeURIComponent(id)}`,
        { method: 'DELETE' }
    );
}

const bookService = {
    getBooks,
    searchBooks,
    getBookById,
    createBook,
    updateBook,
    deleteBook,
};

export default bookService;
