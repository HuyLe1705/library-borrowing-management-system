import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../Context/AuthContext';
import {
    hasPermission,
    hasRole,
    getDefaultRoute,
} from '../../Utils/permissions';

const ProtectedRoute = ({
    children,
    allowedRoles,
    requiredPermission,
}) => {
    const { user, isAuthenticated, loading } = useAuth();
    const location = useLocation();

    // Chờ AuthContext khôi phục phiên đăng nhập.
    if (loading) {
        return (
            <div className="route-loading" role="status">
                Đang kiểm tra quyền truy cập...
            </div>
        );
    }

    // Chưa đăng nhập: chuyển đến login và lưu trang định truy cập.
    if (!isAuthenticated || !user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    // Nếu route yêu cầu role cụ thể.
    if (
        allowedRoles &&
        !hasRole(user, allowedRoles)
    ) {
        return (
            <Navigate
                to={getDefaultRoute(user)}
                replace
                state={{ forbidden: true }}
            />
        );
    }

    // Nếu route yêu cầu permission cụ thể.
    if (
        requiredPermission &&
        !hasPermission(user, requiredPermission)
    ) {
        return (
            <Navigate
                to={getDefaultRoute(user)}
                replace
                state={{ forbidden: true }}
            />
        );
    }

    return children;
};

export default ProtectedRoute;