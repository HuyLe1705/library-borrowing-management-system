
import { apiRequest, unwrapData } from './apiClient';

export async function loginRequest(credentials) {
    const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: credentials,
    });

    return unwrapData(response);
}

export async function registerRequest(userData) {
    const response = await apiRequest('/auth/register', {
        method: 'POST',
        body: userData,
    });

    return unwrapData(response);
}
