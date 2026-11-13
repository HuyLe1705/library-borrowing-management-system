import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import './header.css';

const NAV_ITEMS = [
    { label: 'Trang chủ', path: '/', exact: true },
    { label: 'Tra cứu sách', path: '/search' },
    { label: 'Danh mục', path: '/categories' },
    { label: 'Giới thiệu', path: '/about' },
];

// Các đường dẫn này cần được khai báo trong App.jsx
// khi những trang tài khoản tương ứng được xây dựng.
const ACCOUNT_ITEMS = [
    {
        label: 'Trang của tôi',
        description: 'Thông tin và tài khoản cá nhân',
        path: '/my-account',
        icon: '◉',
    },
    {
        label: 'Lịch sử mượn sách',
        description: 'Theo dõi các lượt mượn và trả',
        path: '/my-books?tab=history',
        icon: '◷',
    },
    {
        label: 'Sách đang mượn',
        description: 'Sách đang mượn và hạn trả',
        path: '/my-books',
        icon: '▤',
    },
    {
        label: 'Đổi mật khẩu',
        description: 'Cập nhật mật khẩu tài khoản',
        path: '/change-password',
        icon: '◇',
    },
];

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { user, isAuthenticated, logout } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    const accountRef = useRef(null);
    const mobileNavRef = useRef(null);
    const accountButtonRef = useRef(null);

    const isActive = (item) => {
        if (item.exact) {
            return location.pathname === item.path;
        }

        return (
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`)
        );
    };

    const displayName =
        user?.fullName ||
        user?.username ||
        user?.name ||
        'Tài khoản';

    const avatarLetter = displayName.trim().charAt(0).toUpperCase() || 'U';

    const closeMenu = () => setMenuOpen(false);

    const closeAccountMenu = () => setAccountOpen(false);

    // Đóng menu tài khoản khi bấm ra ngoài.
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                accountRef.current &&
                !accountRef.current.contains(event.target)
            ) {
                setAccountOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Đóng các menu khi chuyển trang.
    useEffect(() => {
        setAccountOpen(false);
        setMenuOpen(false);
    }, [location.pathname]);

    // Đóng menu bằng phím Escape.
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setAccountOpen(false);
                setMenuOpen(false);
                accountButtonRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();

            setAccountOpen(false);
            setMenuOpen(false);

            navigate('/');
        } catch (error) {
            console.error('Đăng xuất thất bại:', error);
        }
    };

    const handleAccountNavigation = (path) => {
        setAccountOpen(false);
        navigate(path);
    };

    const handleLogin = () => {
        setAccountOpen(false);
        setMenuOpen(false);
        navigate('/login');
    };

    return (
        <header className="header">
            {/* Logo */}
            <div className="header-left">
                <Link
                    to="/"
                    className="logo"
                    onClick={closeMenu}
                    aria-label="BK Library - Trang chủ"
                >
                    <img src="/Image/logolib.png" alt="BK Library" />
                    <span>BK Library</span>
                </Link>
            </div>

            {/* Navigation */}
            <nav
                id="public-navigation"
                ref={mobileNavRef}
                className={`header-nav ${menuOpen ? 'open' : ''}`}
                aria-label="Điều hướng chính"
            >
                {NAV_ITEMS.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={isActive(item) ? 'active' : ''}
                        aria-current={
                            isActive(item) ? 'page' : undefined
                        }
                        onClick={closeMenu}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            {/* Khu vực tài khoản */}
            <div className="header-right" ref={accountRef}>
                {isAuthenticated ? (
                    <>
                        {/* Đã đăng nhập: avatar + tên, không có khung */}
                        <button
                            ref={accountButtonRef}
                            type="button"
                            className={`account-trigger ${
                                accountOpen ? 'is-open' : ''
                            }`}
                            onClick={() => {
                                setAccountOpen((prev) => !prev);
                                setMenuOpen(false);
                            }}
                            aria-expanded={accountOpen}
                            aria-haspopup="menu"
                            aria-controls="account-dropdown"
                            aria-label={`Mở menu tài khoản ${displayName}`}
                        >
                            <span className="admin-avatar">
                                {avatarLetter}
                            </span>

                            <span className="admin-label">
                                <span className="account-name">
                                    {displayName}
                                </span>
                                <small>Tài khoản của tôi</small>
                            </span>

                            <svg
                                className={`account-arrow ${
                                    accountOpen ? 'rotated' : ''
                                }`}
                                viewBox="0 0 20 20"
                                fill="none"
                                aria-hidden="true"
                            >
                                <path
                                    d="m5 7.5 5 5 5-5"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>

                        {accountOpen && (
                            <div
                                id="account-dropdown"
                                className="account-dropdown"
                                role="menu"
                            >
                                {/* Thông tin người dùng */}
                                <div className="account-info">
                                    <span className="admin-avatar account-avatar-large">
                                        {avatarLetter}
                                    </span>

                                    <div className="account-info-text">
                                        <strong>{displayName}</strong>
                                        <small>Đã đăng nhập</small>
                                    </div>
                                </div>

                                <div className="account-divider" />

                                {/* Các chức năng tài khoản */}
                                <div className="account-menu-list">
                                    {ACCOUNT_ITEMS.map((item) => (
                                        <button
                                            key={item.path}
                                            type="button"
                                            className="account-menu-item"
                                            role="menuitem"
                                            onClick={() =>
                                                handleAccountNavigation(
                                                    item.path
                                                )
                                            }
                                        >
                                            <span
                                                className="account-menu-icon"
                                                aria-hidden="true"
                                            >
                                                {item.icon}
                                            </span>

                                            <span className="account-menu-copy">
                                                <span>{item.label}</span>
                                                <small>
                                                    {item.description}
                                                </small>
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="account-divider account-divider-bottom" />

                                {/* Đăng xuất luôn nằm cuối menu */}
                                <button
                                    type="button"
                                    className="logout-button"
                                    role="menuitem"
                                    onClick={handleLogout}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M10 17l5-5-5-5M15 12H3m9-8h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5"
                                            stroke="currentColor"
                                            strokeWidth="1.8"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    /* Chưa đăng nhập: chỉ hiện nút Đăng nhập */
                    <button
                        type="button"
                        className="login-link"
                        onClick={handleLogin}
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M15 17l5-5-5-5m5 5H9m3-8H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>

                        <span>Đăng nhập</span>
                    </button>
                )}
            </div>

            {/* Mobile menu button */}
            <button
                type="button"
                className="header-toggle"
                aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
                aria-expanded={menuOpen}
                aria-controls="public-navigation"
                onClick={() => {
                    setMenuOpen((prev) => !prev);
                    setAccountOpen(false);
                }}
            >
                {menuOpen ? '×' : '☰'}
            </button>
        </header>
    );
};

export default Header;