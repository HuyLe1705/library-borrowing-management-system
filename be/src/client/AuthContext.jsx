import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('lbms_token') || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Kiểm tra phiên đăng nhập khi khởi động App (đọc token từ localStorage và gọi /api/auth/me)
    const checkAuth = useCallback(async (authToken) => {
        const activeToken = authToken || token;
        if (!activeToken) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${activeToken}`,
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setUser(data.data);
                setError(null);
            } else {
                // Token không hợp lệ hoặc hết hạn -> xóa token và logout
                logout();
            }
        } catch (err) {
            console.error('Không thể xác thực phiên đăng nhập:', err);
            // Giữ lại user lưu tạm nếu offline hoặc lỗi mạng, hoặc logout tùy chính sách
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    // Hàm Đăng nhập: nhận username (hoặc MSSV/email) và password
    const login = async (username, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Đăng nhập không thành công.');
            }

            const { token: receivedToken, user: loggedInUser } = data.data;

            // Lưu vào localStorage
            localStorage.setItem('lbms_token', receivedToken);
            localStorage.setItem('lbms_user', JSON.stringify(loggedInUser));

            setToken(receivedToken);
            setUser(loggedInUser);
            setError(null);

            return data.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Hàm Đăng ký: nhận { username, password, fullName, email, userCode, phone, role }
    const register = async (userData) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Đăng ký không thành công.');
            }

            const { token: receivedToken, user: registeredUser } = data.data;

            // Lưu vào localStorage
            localStorage.setItem('lbms_token', receivedToken);
            localStorage.setItem('lbms_user', JSON.stringify(registeredUser));

            setToken(receivedToken);
            setUser(registeredUser);
            setError(null);

            return data.data;
        } catch (err) {
            setError(err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    // Hàm Đăng xuất
    const logout = () => {
        localStorage.removeItem('lbms_token');
        localStorage.removeItem('lbms_user');
        setToken(null);
        setUser(null);
        setError(null);
    };

    // Helper gọi API có đính kèm Bearer Token tự động
    const authFetch = async (url, options = {}) => {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
        const response = await fetch(fullUrl, { ...options, headers });

        if (response.status === 401) {
            logout();
        }

        return response;
    };

    const value = {
        user,
        token,
        isAuthenticated: !!user,
        role: user?.role || null, // 'STUDENT' | 'LECTURER' | 'LIBRARIAN' | 'ADMIN'
        isAdmin: user?.role === 'ADMIN',
        isLibrarian: user?.role === 'LIBRARIAN' || user?.role === 'ADMIN',
        isReader: user?.role === 'STUDENT' || user?.role === 'LECTURER',
        hasRole: (...roles) => (user?.role ? roles.includes(user.role) : false),
        loading,
        error,
        register,
        login,
        logout,
        authFetch,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook tùy biến useAuth để component con dễ dàng sử dụng
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth phải được sử dụng bên trong <AuthProvider>');
    }
    return context;
};

export default AuthContext;
