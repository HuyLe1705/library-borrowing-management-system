import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import './AdminLayout.css';

const navigationItems = [
    {
        label: 'Tổng quan',
        path: '/admin/dashboard',
        icon: '▦',
    },
    {
        label: 'Quản lý sách',
        path: '/admin/books',
        icon: '📚',
    },
    {
        label: 'Quản lý mượn / trả',
        path: '/admin/circulation',
        icon: '⇄',
    },
    {
        label: 'Quản lý người dùng',
        path: '/admin/users',
        icon: '👥',
    },
    {
        label: 'Nhật ký hoạt động',
        path: '/admin/activity-logs',
        icon: '📋',
    },
];

function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const displayName =
        user?.fullName || user?.username || user?.name || 'Quản trị viên';

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <div className="admin-layout">
            {sidebarOpen && (
                <button
                    className="admin-sidebar-overlay"
                    aria-label="Đóng menu"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <aside
                className={`admin-sidebar ${
                    sidebarOpen ? 'admin-sidebar-open' : ''
                }`}
            >
                <div className="admin-brand">
                    <div className="admin-brand-logo">BK</div>
                    <div>
                        <h2>BK Library</h2>
                        <span>Administration</span>
                    </div>
                </div>

                <div className="admin-sidebar-label">
                    WORKSPACE
                </div>

                <nav className="admin-navigation">
                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `admin-nav-link ${
                                    isActive ? 'admin-nav-link-active' : ''
                                }`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="admin-nav-icon">
                                {item.icon}
                            </span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="admin-sidebar-bottom">
                    <div className="admin-role-badge">
                        <span className="admin-status-dot" />
                        ADMINISTRATOR
                    </div>

                    <NavLink
                        to="/"
                        className="admin-nav-link"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <span className="admin-nav-icon">⌂</span>
                        <span>Về trang người dùng</span>
                    </NavLink>
                </div>
            </aside>

            <div className="admin-main">
                <header className="admin-topbar">
                    <div className="admin-topbar-left">
                        <button
                            type="button"
                            className="admin-menu-toggle"
                            onClick={() =>
                                setSidebarOpen((current) => !current)
                            }
                            aria-label="Mở hoặc đóng menu"
                        >
                            ☰
                        </button>

                        <div className="admin-breadcrumb">
                            <span>BK Library</span>
                            <span className="admin-breadcrumb-divider">
                                /
                            </span>
                            <strong>Administration</strong>
                        </div>
                    </div>

                    <div className="admin-account">
                        <div className="admin-account-info">
                            <strong>{displayName}</strong>
                            <span>Quản trị viên</span>
                        </div>

                        <div className="admin-avatar">
                            {displayName.charAt(0).toUpperCase()}
                        </div>

                        <button
                            type="button"
                            className="admin-logout-button"
                            onClick={handleLogout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </header>

                <main className="admin-content">
                    <Outlet />
                </main>

                <footer className="admin-footer">
                    BK Library Management System
                </footer>
            </div>
        </div>
    );
}

export default AdminLayout;