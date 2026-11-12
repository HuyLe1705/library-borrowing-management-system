
import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-main">
                    {/* Brand */}
                    <div className="footer-brand">
                        <Link
                            to="/"
                            className="footer-logo"
                            aria-label="BK Library - Trang chủ"
                        >
                            <img src="/Image/logolib.png" alt="" />
                            <span>BK Library</span>
                        </Link>

                        <p className="footer-description">
                            Kho tri thức vô tận, đồng hành cùng hành trình
                            học tập và phát triển của bạn.
                        </p>
                    </div>

                    {/* Quick links */}
                    <div className="footer-column">
                        <h3>Khám phá</h3>
                        <Link to="/">Trang chủ</Link>
                        <Link to="/search">Tra cứu sách</Link>
                        <Link to="/search">Danh mục sách</Link>
                    </div>

                    {/* Borrowing */}
                    <div className="footer-column">
                        <h3>Dịch vụ thư viện</h3>
                        <Link to="/cart">Đăng ký mượn</Link>
                        <Link to="/my-borrowings">Theo dõi mượn trả</Link>
                        <Link to="/return">Quầy trả sách</Link>
                    </div>

                    {/* Support */}
                    <div className="footer-column">
                        <h3>Hỗ trợ</h3>
                        <a href="mailto:library@example.com">
                            Liên hệ thư viện
                        </a>
                        <a href="mailto:library@example.com?subject=Ho%20tro%20BK%20Library">
                            Gửi yêu cầu hỗ trợ
                        </a>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>
                        © {currentYear} BK Library. All rights reserved.
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
