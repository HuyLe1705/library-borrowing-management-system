import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="site-footer">
            {/* Đường nhấn màu thương hiệu */}

            <div className="footer-container">
                <div className="footer-main">
                    {/* Thương hiệu */}
                    <div className="footer-brand">
                        <Link
                            to="/"
                            className="footer-logo"
                            aria-label="BK Library - Trang chủ"
                        >
                            <span className="footer-logo-icon">
                                <img
                                    src="/Image/logolib.png"
                                    alt=""
                                />
                            </span>

                            <span>BK Library</span>
                        </Link>

                        <p className="footer-description">
                            Kho tri thức vô tận, đồng hành cùng hành trình
                            học tập và phát triển của bạn.
                        </p>

                        <div className="footer-brand-badge">
                            <span className="footer-status-dot" />
                            Không gian tri thức dành cho mọi người
                        </div>
                    </div>

                    {/* Khám phá */}
                    <div className="footer-column">
                        <h3>Khám phá</h3>

                        <Link to="/">
                            <span>Trang chủ</span>
                        </Link>

                        <Link to="/search">
                            <span>Tra cứu sách</span>
                        </Link>

                        <Link to="/categories">
                            <span>Danh mục sách</span>
                        </Link>

                        <Link to="/about">
                            <span>Giới thiệu thư viện</span>
                        </Link>
                    </div>

                    {/* Dịch vụ thư viện */}
                    <div className="footer-column">
                        <h3>Dịch vụ thư viện</h3>

                        <Link to="/cart">
                            <span>Đăng ký mượn sách</span>
                        </Link>

                        <Link to="/my-borrowings">
                            <span>Theo dõi mượn trả</span>
                        </Link>

                        <Link to="/return">
                            <span>Quầy trả sách</span>
                        </Link>
                    </div>

                    {/* Hỗ trợ */}
                    <div className="footer-column">
                        <h3>Hỗ trợ</h3>

                        <a href="mailto:library@example.com">
                            <span>Liên hệ thư viện</span>
                        </a>

                        <a
                            href="mailto:library@example.com?subject=Ho%20tro%20BK%20Library"
                        >
                            <span>Gửi yêu cầu hỗ trợ</span>
                        </a>
                    </div>
                </div>

                {/* Thanh cuối Footer */}
                <div className="footer-bottom">
                    <p className="footer-copyright">
                        © {currentYear} BK Library.
                        <span> All rights reserved.</span>
                    </p>

                    <p className="footer-slogan">
                        Sách là người bạn tốt nhất của con người.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;