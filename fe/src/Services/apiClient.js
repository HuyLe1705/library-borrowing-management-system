const API_BASE_URL = 'http://localhost:5000/api';

export async function apiRequest(
    endpoint,
    {
        method = 'GET',
        body,
        params,
        headers = {},
    } = {}
) {
    const url = new URL(
        `${API_BASE_URL}${endpoint}`,
        window.location.origin
    );

    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }

    const token = localStorage.getItem('token');

    console.log('[apiRequest] 1. URL:', url.toString());
    console.log('[apiRequest] 2. Sending request...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url.toString(), {
            method,
            signal: controller.signal,
            headers: {
                ...(body !== undefined
                    ? { 'Content-Type': 'application/json' }
                    : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...headers,
            },
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });

        console.log('[apiRequest] 3. HTTP status:', response.status);

        if (response.status === 204) {
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        const result = contentType.includes('application/json')
            ? await response.json()
            : await response.text();

        console.log('[apiRequest] 4. Response body:', result);

        if (!response.ok) {
            const message =
                typeof result === 'object' && result !== null
                    ? result.message || result.error
                    : result;

            throw new Error(
                message || `Request thất bại (${response.status}).`
            );
        }

        return result;
    } catch (error) {
        console.error('[apiRequest] Request failed:', error);
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

// Hỗ trợ API trả dữ liệu trực tiếp hoặc bọc trong ApiResponse.data.
export function unwrapData(response) {
    if (
        response &&
        typeof response === 'object' &&
        Object.prototype.hasOwnProperty.call(response, 'data')
    ) {
        return response.data;
    }

    return response;
}
