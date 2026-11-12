import React, { useCallback, useEffect, useState } from 'react';
import { apiRequest, unwrapData } from '../../Services/apiClient';
import './AdminPages.css';

const getList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.borrows)) return data.borrows;
    return [];
};

const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('vi-VN');
};

const getStatusLabel = (status) => {
    const statuses = {
        PENDING: 'Chờ duyệt',
        REQUESTED: 'Chờ duyệt',
        APPROVED: 'Đã duyệt',
        BORROWED: 'Đang mượn',
        RETURNED: 'Đã trả',
        OVERDUE: 'Quá hạn',
        REJECTED: 'Đã từ chối',
        CANCELLED: 'Đã hủy',
        CLOSED: 'Đã đóng',
    };

    const normalized = String(status || '').toUpperCase();
    return statuses[normalized] || status || '—';
};

const isReturned = (item) => {
    const status = String(item.status || '').toUpperCase();

    return Boolean(item.returnDate || item.returnedAt) ||
        ['RETURNED', 'CLOSED'].includes(status);
};

function CirculationManagement() {
    const [tab, setTab] = useState('all');
    const [borrowings, setBorrowings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [busyId, setBusyId] = useState(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            // Backend hiện tại sử dụng /borrows, không phải /borrowings.
            const response = await apiRequest('/borrows');
            const data = unwrapData(response);

            setBorrowings(getList(data));
        } catch (err) {
            setError(
                err.message || 'Không thể tải danh sách giao dịch mượn/trả.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleReturn = async (borrowing) => {
        const id = borrowing.id ?? borrowing.borrowingId;

        if (id == null) {
            setError('Giao dịch này không có ID hợp lệ.');
            return;
        }

        if (isReturned(borrowing)) {
            setError('Giao dịch này đã được ghi nhận trả sách.');
            return;
        }

        const confirmed = window.confirm(
            `Xác nhận đã nhận lại sách "${borrowing.bookTitle || 'chưa rõ tên sách'}" từ ${borrowing.borrowerName || 'người mượn'}?`
        );

        if (!confirmed) return;

        setBusyId(id);
        setError('');

        try {
            /*
             * Endpoint này cần được xác nhận với backend.
             * Nếu backend dùng endpoint khác, hãy thay đường dẫn tại đây.
             */
            await apiRequest(`/borrows/${encodeURIComponent(id)}/return`, {
                method: 'PATCH',
            });

            await loadData();
        } catch (err) {
            setError(
                err.message || 'Không thể xác nhận trả sách. Vui lòng kiểm tra API backend.'
            );
        } finally {
            setBusyId(null);
        }
    };

    const normalizedKeyword = keyword.trim().toLowerCase();

    const filteredBorrowings = borrowings.filter((item) => {
        const matchesKeyword =
            !normalizedKeyword ||
            [
                item.borrowerCode,
                item.borrowerName,
                item.barcode,
                item.bookTitle,
                item.shelfLocation,
            ].some((value) =>
                String(value || '').toLowerCase().includes(normalizedKeyword)
            );

        const status = String(item.status || '').toUpperCase();
        const matchesStatus =
            statusFilter === 'ALL' || status === statusFilter;

        const returned = isReturned(item);

        const matchesTab =
            tab === 'all' ||
            (tab === 'active' && !returned) ||
            (tab === 'returned' && returned);

        return matchesKeyword && matchesStatus && matchesTab;
    });

    const activeCount = borrowings.filter((item) => !isReturned(item)).length;
    const returnedCount = borrowings.filter(isReturned).length;

    return (
        <div className="admin-page">
            <h1>Quản lý mượn / trả sách</h1>

            <p className="admin-subtitle">
                Theo dõi giao dịch mượn sách, hạn trả và xác nhận sách được trả lại.
            </p>

            <div className="admin-stats">
                <div className="admin-panel">
                    <span>Tổng giao dịch</span>
                    <h2>{borrowings.length}</h2>
                </div>

                <div className="admin-panel">
                    <span>Chưa trả</span>
                    <h2>{activeCount}</h2>
                </div>

                <div className="admin-panel">
                    <span>Đã trả</span>
                    <h2>{returnedCount}</h2>
                </div>
            </div>

            {error && (
                <div role="alert" className="admin-error">
                    {error}
                </div>
            )}

            <div className="admin-tabs">
                <button
                    type="button"
                    className={tab === 'all' ? 'admin-activeButton' : 'admin-button'}
                    onClick={() => setTab('all')}
                >
                    Tất cả ({borrowings.length})
                </button>

                <button
                    type="button"
                    className={tab === 'active' ? 'admin-activeButton' : 'admin-button'}
                    onClick={() => setTab('active')}
                >
                    Chưa trả ({activeCount})
                </button>

                <button
                    type="button"
                    className={tab === 'returned' ? 'admin-activeButton' : 'admin-button'}
                    onClick={() => setTab('returned')}
                >
                    Đã trả ({returnedCount})
                </button>

                <button
                    type="button"
                    className="admin-button"
                    onClick={loadData}
                    disabled={loading}
                >
                    {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            <section className="admin-panel">
                <div className="admin-toolbar">
                    <input
                        type="search"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Tìm theo mã bạn đọc, tên người mượn, mã sách..."
                        aria-label="Tìm giao dịch mượn sách"
                    />

                    <select
                        value={statusFilter}
                        onChange={(event) => setStatusFilter(event.target.value)}
                        aria-label="Lọc theo trạng thái"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="BORROWED">Đang mượn</option>
                        <option value="RETURNED">Đã trả</option>
                        <option value="OVERDUE">Quá hạn</option>
                        <option value="PENDING">Chờ duyệt</option>
                        <option value="APPROVED">Đã duyệt</option>
                        <option value="REJECTED">Đã từ chối</option>
                    </select>
                </div>

                {loading ? (
                    <p>Đang tải dữ liệu mượn/trả...</p>
                ) : filteredBorrowings.length === 0 ? (
                    <p>Không tìm thấy giao dịch phù hợp.</p>
                ) : (
                    <div className="admin-tableWrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th className="admin-cell">Mã bạn đọc</th>
                                    <th className="admin-cell">Người mượn</th>
                                    <th className="admin-cell">Tên sách</th>
                                    <th className="admin-cell">Mã bản sách</th>
                                    <th className="admin-cell">Ngày mượn</th>
                                    <th className="admin-cell">Hạn trả</th>
                                    <th className="admin-cell">Ngày trả</th>
                                    <th className="admin-cell">Trạng thái</th>
                                    <th className="admin-cell">Thao tác</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredBorrowings.map((item, index) => {
                                    const id = item.id ?? item.borrowingId;
                                    const returned = isReturned(item);
                                    const status = String(item.status || '').toUpperCase();

                                    const overdue =
                                        !returned &&
                                        item.dueDate &&
                                        new Date(item.dueDate) < new Date() &&
                                        status !== 'PENDING' &&
                                        status !== 'REJECTED';

                                    return (
                                        <tr key={id ?? index}>
                                            <td className="admin-cell">
                                                {item.borrowerCode || '—'}
                                            </td>

                                            <td className="admin-cell">
                                                {item.borrowerName || '—'}
                                            </td>

                                            <td className="admin-cell">
                                                {item.bookTitle || '—'}
                                            </td>

                                            <td className="admin-cell">
                                                {item.barcode || '—'}
                                            </td>

                                            <td className="admin-cell">
                                                {formatDate(item.borrowDate)}
                                            </td>

                                            <td className="admin-cell">
                                                {formatDate(item.dueDate)}
                                            </td>

                                            <td className="admin-cell">
                                                {formatDate(item.returnDate || item.returnedAt)}
                                            </td>

                                            <td className="admin-cell">
                                                {overdue
                                                    ? 'Quá hạn'
                                                    : getStatusLabel(item.status)}
                                            </td>

                                            <td className="admin-cell">
                                                {returned ? (
                                                    'Đã trả'
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="admin-activeButton"
                                                        disabled={busyId === id || loading}
                                                        onClick={() => handleReturn(item)}
                                                    >
                                                        {busyId === id
                                                            ? 'Đang xử lý...'
                                                            : 'Xác nhận trả'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

export default CirculationManagement;