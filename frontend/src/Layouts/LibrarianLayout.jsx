import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";
import "./LibrarianLayout.css";

const navigation = [
  {
    label: "Tổng quan",
    path: "/librarian",
    icon: "▦",
    end: true,
  },
  {
    label: "Mượn sách",
    path: "/librarian/borrow",
    icon: "↗",
  },
  {
    label: "Trả sách",
    path: "/librarian/return",
    icon: "↙",
  },
  {
    label: "Phiếu mượn",
    path: "/librarian/borrowings",
    icon: "▤",
  },
  {
    label: "Yêu cầu mượn",
    path: "/librarian/requests",
    icon: "◷",
  },
  {
    label: "Tra cứu sách",
    path: "/librarian/books",
    icon: "▣",
  },
  {
    label: "Tra cứu độc giả",
    path: "/librarian/readers",
    icon: "♙",
  },
];

export default function LibrarianLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName =
    user?.fullName ||
    user?.username ||
    user?.name ||
    "Thủ thư";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="librarian-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="librarian-sidebar-overlay"
          aria-label="Đóng menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`librarian-sidebar ${
          sidebarOpen ? "librarian-sidebar-open" : ""
        }`}
      >
        <div className="librarian-brand">
          <div className="librarian-brand-icon">B</div>

          <div>
            <h2>BK Library</h2>
            <span>LIBRARY MANAGEMENT</span>
          </div>
        </div>

        <div className="librarian-profile">
          <div className="librarian-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="librarian-profile-info">
            <strong>{displayName}</strong>
            <span>LIBRARIAN</span>
          </div>

          <span className="librarian-online-dot" />
        </div>

        <div className="librarian-nav-heading">NGHIỆP VỤ</div>

        <nav className="librarian-nav">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `librarian-nav-link ${isActive ? "active" : ""}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="librarian-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="librarian-sidebar-bottom">
          <div className="librarian-help-card">
            <strong>Cần hỗ trợ?</strong>
            <p>
              Liên hệ quản trị viên khi gặp sự cố trong quá trình xử lý
              giao dịch.
            </p>
          </div>
        </div>
      </aside>

      <div className="librarian-main">
        <header className="librarian-topbar">
          <div className="librarian-topbar-left">
            <button
              type="button"
              className="librarian-menu-toggle"
              onClick={() => setSidebarOpen((current) => !current)}
              aria-label="Mở hoặc đóng menu"
            >
              ☰
            </button>

            <div className="librarian-breadcrumb">
              <span>BK Library</span>
              <span className="librarian-breadcrumb-divider">/</span>
              <strong>Không gian thủ thư</strong>
            </div>
          </div>

          <div className="librarian-topbar-right">
            <span className="librarian-status">
              <span />
              Hệ thống thư viện
            </span>

            <div className="librarian-account">
              <div className="librarian-topbar-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="librarian-account-info">
                <strong>{displayName}</strong>
                <span>Thủ thư</span>
              </div>

              <button
                type="button"
                className="librarian-logout-button"
                onClick={handleLogout}
              >
                <span>↪</span>
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <main className="librarian-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}