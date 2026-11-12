import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../Context/AuthContext';
import './header.css';

const NAV_ITEMS = [
    {
        label: 'Trang chủ',
        path: '/',
        exact: true,
    },
    {
        label: 'Tra cứu sách',
        path: '/search',
    },
    {
        label: 'Danh mục',
        path: '/categories',
    },
    {
        label: 'Sách mới',
        path: '/new-arrivals',
    },
    {
        label: 'Giới thiệu',
        path: '/about',
    },
];

const Header = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { user, isAuthenticated, logout } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);

    const accountRef = useRef(null);

    const isActive = (item) => {
        if (item.exact) {
            return location.pathname === item.path;
        }

        return (
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`)
        );
    };

    const closeMenu = () => setMenuOpen(false);

    // Đóng dropdown khi click ra ngoài.
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
            document.removeEventListener(
                'mousedown',
                handleClickOutside
            );
        };
    }, []);

    // Đóng menu khi chuyển trang.
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
            closeMenu();
            navigate('/');
        } catch (error) {
            console.error('Đăng xuất thất bại:', error);
        }
    };

    const displayName =
        user?.fullName ||
        user?.username ||
        user?.name ||
        (isAuthenticated ? 'Tài khoản' : 'Khách');

    const avatarLetter = displayName.charAt(0).toUpperCase();

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

            {/* Account */}
            <div className="header-right" ref={accountRef}>
                <button
                    type="button"
                    className="btn-login"
                    onClick={() => {
                        setAccountOpen((prev) => !prev);
                        setMenuOpen(false);
                    }}
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    aria-label={`Tài khoản: ${displayName}`}
                >
                    <span className="admin-avatar">
                        {avatarLetter}
                    </span>

                    <span className="admin-label">
                        <span>{displayName}</span>
                        <small>
                            {isAuthenticated
                                ? 'Tài khoản'
                                : 'Chưa đăng nhập'}
                        </small>
                    </span>

                    <span className="account-arrow" aria-hidden="true">
                        {accountOpen ? '▲' : '▼'}
                    </span>
                </button>

                {accountOpen && (
                    <div className="account-dropdown" role="menu">
                        <div className="account-info">
                            <span className="admin-avatar">
                                {avatarLetter}
                            </span>

                            <div>
                                <strong>{displayName}</strong>
                                <small>
                                    {isAuthenticated
                                        ? 'Đã đăng nhập'
                                        : 'Khách truy cập'}
                                </small>
                            </div>
                        </div>

                        <div className="account-divider" />

                        {isAuthenticated ? (
                            <button
                                type="button"
                                className="logout-button"
                                role="menuitem"
                                onClick={handleLogout}
                            >
                                <span aria-hidden="true">↪</span>
                                Đăng xuất
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="logout-button"
                                role="menuitem"
                                onClick={() => {
                                    setAccountOpen(false);
                                    navigate('/login');
                                }}
                            >
                                <span aria-hidden="true">→</span>
                                Đăng nhập
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile menu */}
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