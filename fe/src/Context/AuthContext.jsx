
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Khôi phục thông tin đăng nhập khi tải lại trang
    useEffect(() => {
        try {
            const token = localStorage.getItem(TOKEN_KEY);
            const storedUser = localStorage.getItem(USER_KEY);

            if (token && storedUser) {
                setUser(JSON.parse(storedUser));
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Không thể khôi phục phiên đăng nhập:', error);

            localStorage.removeItem(USER_KEY);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Cập nhật trạng thái sau khi API đăng nhập thành công
    const login = useCallback((userData, token) => {
        if (!userData || !token) {
            throw new Error('Thiếu thông tin người dùng hoặc token.');
        }

        // Lưu token trước; chỉ cập nhật state khi lưu thành công
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));

        setUser(userData);
    }, []);

    // Xóa phiên đăng nhập ở phía frontend
    const logout = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);

        setUser(null);
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        isAuthenticated: Boolean(user),
        login,
        logout,
    }), [user, loading, login, logout]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook dùng chung cho toàn bộ ứng dụng
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth phải được sử dụng bên trong AuthProvider.');
    }

    return context;
};
