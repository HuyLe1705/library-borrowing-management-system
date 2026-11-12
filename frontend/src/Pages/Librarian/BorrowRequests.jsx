import React, { useEffect, useState } from 'react';
import './LibrarianPages.css';

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function requestApi(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${getToken()}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers,
        },
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            result.message ||
            result.error ||
            'Không thể thực hiện yêu cầu.'
        );
    }

    return result.data ?? result;
}

function getRequestStatus(request) {
    const status = String(
        request.status ?? request.requestStatus ?? 'PENDING'
    ).toUpperCase();

    if (['APPROVED', 'ACCEPTED'].includes(status)) {
        return {
            label: 'Đã duyệt',
            className: 'status-success',
        };
    }

    if (['REJECTED', 'DECLINED'].includes(status)) {
        return {
            label: 'Đã từ chối',
            className: 'status-danger',
        };
    }

    if (['CANCELLED', 'CANCELED'].includes(status)) {
        return {
            label: 'Đã hủy',
            className: 'status-neutral',
        };
    }

    return {
        label: 'Chờ xử lý',
        className: 'status-warning',
    };
}

function formatDate(value) {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString('vi-VN');
}

export default function BorrowRequests() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING');

    const loadRequests = async () => {
        try {
            setLoading(true);
            setError('');

            const data = await requestApi('/borrow-requests');

            const items = Array.isArray(data)
                ? data
                : data.requests ?? data.items ?? [];

            setRequests(items);
        } catch (err) {
            setError(
                err.message ||
                'Không thể tải danh sách yêu cầu mượn.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, []);

    const handleDecision = async (request, action) => {
        const requestId =
            request.id ??
            request.requestId ??
            request.requestCode;

        if (!requestId) {
            setError('Yêu cầu không có mã định danh hợp lệ.');
            return;
        }

        const actionLabel = action === 'approve' ? 'duyệt' : 'từ chối';

        if (
            !window.confirm(
                `Bạn có chắc chắn muốn ${actionLabel} yêu cầu này?`
            )
        ) {
            return;
        }

        try {
            setProcessingId(requestId);
            setError('');
            setMessage('');

            // Các endpoint này là giả định, cần khớp với backend thực tế.
            await requestApi(
                `/borrow-requests/${encodeURIComponent(requestId)}/${action}`,
                {
                    method: 'PATCH',
                }
            );

            setMessage(
                action === 'approve'
                    ? 'Đã duyệt yêu cầu mượn sách.'
                    : 'Đã từ chối yêu cầu mượn sách.'
            );

            await loadRequests();
        } catch (err) {
            setError(
                err.message ||
                `Không thể ${actionLabel} yêu cầu.`
            );
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = requests.filter((request) => {
        if (statusFilter === 'ALL') return true;

        const status = getRequestStatus(request).label;

        if (statusFilter === 'PENDING') {
            return status === 'Chờ xử lý';
        }

        if (statusFilter === 'APPROVED') {
            return status === 'Đã duyệt';
        }

        if (statusFilter === 'REJECTED') {
            return status === 'Đã từ chối';
        }

        return true;
    });

    return (
        <div className="librarian-page">
            <div className="page-heading">
                <div>
                    <h1>Yêu cầu mượn sách</h1>
                    <p>
                        Kiểm tra và xử lý các yêu cầu mượn sách của độc giả.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={loadRequests}
                    disabled={loading}
                >
                    Làm mới
                </button>
            </div>

            <div className="filter-bar">
                <label htmlFor="request-status">
                    Trạng thái:
                </label>

                <select
                    id="request-status"
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                >
                    <option value="PENDING">Chờ xử lý</option>
                    <option value="APPROVED">Đã duyệt</option>
                    <option value="REJECTED">Đã từ chối</option>
                    <option value="ALL">Tất cả</option>
                </select>

                <span className="result-count">
                    {filteredRequests.length} yêu cầu
                </span>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}

            <div className="table-card">
                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã yêu cầu</th>
                                <th>Độc giả</th>
                                <th>Mã độc giả</th>
                                <th>Sách</th>
                                <th>Mã vạch</th>
                                <th>Ngày yêu cầu</th>
                                <th>Trạng thái</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="empty-state">
                                        Không có yêu cầu phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((request, index) => {
                                    const id =
                                        request.id ??
                                        request.requestId ??
                                        request.requestCode ??
                                        index;

                                    const status = getRequestStatus(request);
                                    const isPending =
                                        status.label === 'Chờ xử lý';

                                    return (
                                        <tr key={id}>
                                            <td>
                                                {request.requestCode ??
                                                    request.id ??
                                                    request.requestId ??
                                                    '—'}
                                            </td>

                                            <td className="primary-cell">
                                                {request.user?.fullName ??
                                                    request.reader?.fullName ??
                                                    request.fullName ??
                                                    request.username ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {request.user?.userCode ??
                                                    request.reader?.userCode ??
                                                    request.userCode ??
                                                    request.readerCode ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {request.book?.title ??
                                                    request.bookTitle ??
                                                    request.title ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {request.barcode ??
                                                    request.bookCopy?.barcode ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {formatDate(
                                                    request.createdAt ??
                                                    request.requestDate
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={`status-badge ${status.className}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </td>

                                            <td>
                                                {isPending ? (
                                                    <div className="action-buttons">
                                                        <button
                                                            type="button"
                                                            className="success-button"
                                                            disabled={
                                                                processingId !== null
                                                            }
                                                            onClick={() =>
                                                                handleDecision(
                                                                    request,
                                                                    'approve'
                                                                )
                                                            }
                                                        >
                                                            {processingId === id
                                                                ? 'Đang xử lý...'
                                                                : 'Duyệt'}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="danger-button"
                                                            disabled={
                                                                processingId !== null
                                                            }
                                                            onClick={() =>
                                                                handleDecision(
                                                                    request,
                                                                    'reject'
                                                                )
                                                            }
                                                        >
                                                            Từ chối
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span>Đã xử lý</span>
                                                )}
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