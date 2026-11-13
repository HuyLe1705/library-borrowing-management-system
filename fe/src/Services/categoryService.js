import { apiRequest, unwrapData } from './apiClient';

const CATEGORIES_ENDPOINT = '/categories';

/**
 * Lấy danh sách danh mục sách.
 *
 * Endpoint giả định: GET /categories
 */
export async function getCategories(params = {}) {
    const response = await apiRequest(CATEGORIES_ENDPOINT, {
        params,
    });

    return unwrapData(response);
}

const categoryService = {
    getCategories,
};

export default categoryService;