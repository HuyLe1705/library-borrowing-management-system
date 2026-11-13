import React, { useEffect, useState } from "react";
import "./LibrarianPages.css";
import { getBorrows } from "../../Services/librarianService";

const API_BASE_URL = "http://localhost:5000/api";

async function apiGet(endpoint) {
  const token = localStorage.getItem("token");

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Không thể tải dữ liệu (${response.status}).`);
  }

  return response.json();
}

function unwrapData(response) {
  return response?.data ?? response?.result ?? response;
}

function getArray(response) {
  const data = unwrapData(response);

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.content)) {
    return data.content;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  return [];
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString("vi-VN");
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("vi-VN");
}

function getBookTitle(borrowing) {
  return (
    borrowing?.book?.title ??
    borrowing?.bookTitle ??
    borrowing?.title ??
    "Chưa có thông tin sách"
  );
}

function getReaderName(borrowing) {
    const name =
        borrowing?.borrowerName ??
        borrowing?.borrower?.fullName ??
        borrowing?.reader?.fullName ??
        borrowing?.user?.fullName ??
        borrowing?.readerName ??
        borrowing?.userName ??
        borrowing?.fullName;

    if (typeof name === "string" && name.trim()) {
        return name.trim();
    }

    const code =
        borrowing?.borrowerCode ??
        borrowing?.userCode ??
        borrowing?.readerCode ??
        borrowing?.borrower?.userCode ??
        borrowing?.reader?.userCode;

    if (code) {
        return `Mã độc giả: ${code}`;
    }

    return "Chưa có thông tin độc giả";
}

export default function LibrarianDashboard() {
  const [summary, setSummary] = useState({});
  const [overdueBooks, setOverdueBooks] = useState([]);
  const [recentBorrowings, setRecentBorrowings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const results = await Promise.allSettled([
        apiGet("/dashboard/summary"),
        apiGet("/borrowings/overdue"),
        apiGet("/borrows"),
        apiGet("/dashboard/statistics"),
      ]);

      if (!mounted) return;

      const [summaryResult, overdueResult, borrowingResult, statisticsResult] =
        results;

      if (summaryResult.status === "fulfilled") {
        setSummary(unwrapData(summaryResult.value) ?? {});
      }

      if (overdueResult.status === "fulfilled") {
        setOverdueBooks(getArray(overdueResult.value));
      }

      if (borrowingResult.status === "fulfilled") {
        const borrowings = getArray(borrowingResult.value);

        setRecentBorrowings(
          [...borrowings]
            .sort((a, b) => {
              const dateA = new Date(
                a?.createdAt ?? a?.borrowDate ?? 0
              ).getTime();

              const dateB = new Date(
                b?.createdAt ?? b?.borrowDate ?? 0
              ).getTime();

              return dateB - dateA;
            })
            .slice(0, 6)
        );
      }

      if (statisticsResult.status === "fulfilled") {
        const statistics = unwrapData(statisticsResult.value);

        setSummary((previous) => ({
          ...previous,
          ...(statistics && typeof statistics === "object"
            ? statistics
            : {}),
        }));
      }

      const hasAnySuccess = results.some(
        (result) => result.status === "fulfilled"
      );

      if (!hasAnySuccess) {
        setError(
          "Không thể tải dữ liệu dashboard. Vui lòng kiểm tra API backend."
        );
      }

      setLoading(false);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = [
    {
      label: "Đang được mượn",
      value:
        summary.activeBorrowings ??
        summary.currentBorrowings ??
        summary.borrowedBooks ??
        0,
      icon: "↗",
      tone: "blue",
      description: "Giao dịch chưa hoàn tất",
    },
    {
      label: "Mượn trong ngày",
      value: summary.todayBorrowings ?? summary.todayBorrows ?? 0,
      icon: "＋",
      tone: "green",
      description: "Lượt mượn hôm nay",
    },
    {
      label: "Trả trong ngày",
      value: summary.todayReturns ?? summary.todayReturned ?? 0,
      icon: "↙",
      tone: "purple",
      description: "Lượt trả hôm nay",
    },
    {
      label: "Sách quá hạn",
      value: summary.overdueCount ?? overdueBooks.length,
      icon: "!",
      tone: "orange",
      description: "Cần theo dõi và xử lý",
    },
  ];

  function getStatus(borrowing) {
    const status = String(
      borrowing?.status ?? borrowing?.borrowingStatus ?? ""
    ).toUpperCase();

    if (status.includes("RETURN")) {
      return { label: "Đã trả", className: "status-returned" };
    }

    if (status.includes("OVERDUE")) {
      return { label: "Quá hạn", className: "status-overdue" };
    }

    return { label: "Đang mượn", className: "status-borrowing" };
  }

  return (
    <div className="librarian-page">
      <div className="librarian-page-heading">
        <div>
          <div className="librarian-eyebrow">WORKSPACE / OVERVIEW</div>
          <h1>Tổng quan nghiệp vụ</h1>
          <p>Theo dõi tình hình mượn trả và hoạt động thư viện.</p>
        </div>

        <button
          type="button"
          className="librarian-button librarian-button-secondary"
          onClick={() => window.location.reload()}
        >
          ↻ Làm mới dữ liệu
        </button>
      </div>

      {error && (
        <div className="librarian-alert librarian-alert-error">{error}</div>
      )}

      <section className="librarian-stats-grid">
        {stats.map((stat) => (
          <article className="librarian-stat-card" key={stat.label}>
            <div className={`librarian-stat-icon ${stat.tone}`}>
              {stat.icon}
            </div>

            <div className="librarian-stat-label">{stat.label}</div>

            <div className="librarian-stat-value">
              {loading ? "…" : formatNumber(stat.value)}
            </div>

            <div className="librarian-stat-description">
              {stat.description}
            </div>
          </article>
        ))}
      </section>

      <section className="librarian-panel">
        <div className="librarian-panel-heading">
          <div>
            <h2>Giao dịch gần đây</h2>
            <p>Các phiếu mượn được ghi nhận gần nhất.</p>
          </div>

          <a className="librarian-text-link" href="/librarian/borrowings">
            Xem tất cả →
          </a>
        </div>

        <div className="librarian-table-wrapper">
          <table className="librarian-table">
            <thead>
              <tr>
                <th>Mã phiếu</th>
                <th>Độc giả</th>
                <th>Tên sách</th>
                <th>Ngày mượn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="librarian-table-empty">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : recentBorrowings.length === 0 ? (
                <tr>
                  <td colSpan="5" className="librarian-table-empty">
                    Chưa có giao dịch để hiển thị.
                  </td>
                </tr>
              ) : (
                recentBorrowings.map((borrowing, index) => {
                  const status = getStatus(borrowing);

                  return (
                    <tr key={borrowing.id ?? borrowing.borrowingId ?? index}>
                      <td>
                        <strong>
                          {borrowing.code ??
                            borrowing.borrowingCode ??
                            borrowing.id ??
                            "—"}
                        </strong>
                      </td>

                      <td>{getReaderName(borrowing)}</td>
                      <td>{getBookTitle(borrowing)}</td>
                      <td>
                        {formatDate(
                          borrowing.borrowDate ?? borrowing.createdAt
                        )}
                      </td>

                      <td>
                        <span
                          className={`librarian-status-badge ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="librarian-panel">
        <div className="librarian-panel-heading">
          <div>
            <h2>Danh sách sách quá hạn</h2>
            <p>Các giao dịch cần được thủ thư kiểm tra.</p>
          </div>

          <span className="librarian-count-badge">
            {loading ? "…" : overdueBooks.length} giao dịch
          </span>
        </div>

        <div className="librarian-overdue-list">
          {loading ? (
            <div className="librarian-empty-state">Đang tải dữ liệu...</div>
          ) : overdueBooks.length === 0 ? (
            <div className="librarian-empty-state">
              <span className="librarian-empty-icon">✓</span>
              <strong>Không có sách quá hạn</strong>
              <p>Hiện chưa có giao dịch quá hạn trong dữ liệu được tải.</p>
            </div>
          ) : (
            overdueBooks.slice(0, 5).map((item, index) => (
              <div
                className="librarian-overdue-item"
                key={item.id ?? item.borrowingId ?? index}
              >
                <div className="librarian-overdue-icon">!</div>

                <div className="librarian-overdue-info">
                  <strong>{getBookTitle(item)}</strong>
                  <span>Độc giả: {getReaderName(item)}</span>
                </div>

                <div className="librarian-overdue-date">
                  <span>Hạn trả</span>
                  <strong>
                    {formatDate(item.dueDate ?? item.returnDueDate)}
                  </strong>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}