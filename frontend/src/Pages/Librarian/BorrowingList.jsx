import React, { useEffect, useState } from 'react';
import './LibrarianPages.css';

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function fetchBorrowings(filters = {}) {
    const params = new URLSearchParams();

    if (filters.userCode?.trim()) {
        params.set("userCode", filters.userCode.trim());
    }

    if (filters.barcode?.trim()) {
        params.set("barcode", filters.barcode.trim());
    }

    if (filters.status && filters.status !== "ALL") {
        params.set("status", filters.status);
    }

    const queryString = params.toString();

    const response = await fetch(
        `${API_URL}/borrows${queryString ? `?${queryString}` : ""}`,
        {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${getToken()}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Không thể tải danh sách giao dịch mượn trả.");
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(
            result.message || "Không thể tải danh sách giao dịch."
        );
    }

    return Array.isArray(result.data) ? result.data : [];
}

function getBorrowingStatus(borrowing) {
    const status = String(borrowing.status ?? "").toUpperCase();

    switch (status) {
        case "BORROWED":
            return {
                label: "Đang mượn",
                className: "status-info",
            };

        case "RETURNED":
            return {
                label: "Đã trả",
                className: "status-success",
            };

        case "OVERDUE":
            return {
                label: "Quá hạn",
                className: "status-danger",
            };

        default:
            return {
                label: status || "Chưa xác định",
                className: "status-neutral",
            };
    }
}

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleDateString('vi-VN');
}

export default function BorrowingList() {
    const [keyword, setKeyword] = useState('');
    const [borrowings, setBorrowings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const loadBorrowings = async (filters = {}) => {
        try {
            setLoading(true);
            setError("");

            const data = await fetchBorrowings(filters);

            console.log("[Borrowings] Dữ liệu API:", data);
            setBorrowings(data);
        } catch (err) {
            console.error("[Borrowings] Lỗi:", err);
            setError(err.message || "Có lỗi khi tải dữ liệu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBorrowings();
    }, []);

    const handleSubmit = (event) => {
        event.preventDefault();
        loadBorrowings(keyword);
    };

    const filteredBorrowings = borrowings.filter((borrowing) => {
        if (statusFilter === 'ALL') return true;

        const status = getBorrowingStatus(borrowing);

        if (statusFilter === 'OVERDUE') {
            return status.label === 'Quá hạn';
        }

        if (statusFilter === 'BORROWED') {
            return status.label === 'Đang mượn';
        }

        if (statusFilter === 'RETURNED') {
            return status.label === 'Đã trả';
        }

        if (statusFilter === 'PENDING') {
            return status.label === 'Chờ xử lý';
        }

        return true;
    });

    return (
        <div className="librarian-page">
            <div className="page-heading">
                <div>
                    <h1>Quản lý mượn trả</h1>
                    <p>
                        Theo dõi các phiếu mượn, hạn trả và tình trạng sách.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => loadBorrowings(keyword)}
                    disabled={loading}
                >
                    Làm mới dữ liệu
                </button>
            </div>

            <form className="search-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tìm theo mã phiếu, mã độc giả hoặc mã vạch..."
                />

                <button type="submit" disabled={loading}>
                    Tìm kiếm
                </button>
            </form>

            <div className="filter-bar">
                <label htmlFor="borrowing-status">
                    Trạng thái:
                </label>

                <select
                    id="borrowing-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="ALL">Tất cả</option>
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="BORROWED">Đang mượn</option>
                    <option value="OVERDUE">Quá hạn</option>
                    <option value="RETURNED">Đã trả</option>
                </select>

                <span className="result-count">
                    {filteredBorrowings.length} phiếu
                </span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="table-card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã phiếu</th>
                                <th>Mã độc giả</th>
                                <th>Độc giả</th>
                                <th>Sách</th>
                                <th>Mã vạch</th>
                                <th>Ngày mượn</th>
                                <th>Hạn trả</th>
                                <th>Ngày trả</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="empty-state">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : filteredBorrowings.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="empty-state">
                                        Không có phiếu mượn phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredBorrowings.map((item, index) => {
                                    const status = getBorrowingStatus(item);

                                    return (
                                        <tr
                                            key={
                                                item.id ??
                                                item.borrowingId ??
                                                item.borrowingCode ??
                                                index
                                            }
                                        >
                                            <td>
                                                {item.borrowingCode ??
                                                    item.code ??
                                                    item.id ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {item.borrowerCode ??
                                                    item.user?.userCode ??
                                                    item.reader?.userCode ??
                                                    item.userCode ??
                                                    item.readerCode ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {item.borrowerName ??
                                                    item.borrower?.fullName ??
                                                    item.reader?.fullName ??
                                                    item.user?.fullName ??
                                                    item.fullName ??
                                                    item.username ??
                                                    '—'}
                                            </td>

                                            <td className="primary-cell">
                                                {item.book?.title ??
                                                    item.bookTitle ??
                                                    item.title ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {item.barcode ??
                                                    item.bookCopy?.barcode ??
                                                    item.copy?.barcode ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    item.borrowDate ??
                                                    item.borrowedAt ??
                                                    item.createdAt
                                                )}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    item.dueDate ??
                                                    item.dueAt ??
                                                    item.returnDeadline
                                                )}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    item.returnDate ??
                                                    item.returnedAt
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`status-badge ${status.className}`}
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
            </div>
        </div>
    );
}