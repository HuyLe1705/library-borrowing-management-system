import React, { useEffect, useMemo, useState } from 'react';
import activityLogService from '../../Services/activityLogService';
import './AdminPages.css';

const PAGE_SIZE = 10;

const ACTION_LABELS = {
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    BORROW: 'Mượn sách',
    RETURN: 'Trả sách',
    APPROVE: 'Phê duyệt',
    REJECT: 'Từ chối',
    LOCK: 'Khóa tài khoản',
    UNLOCK: 'Mở khóa tài khoản',
};

const getActionLabel = (action) => {
    if (!action) return 'Không xác định';

    const normalized = String(action).toUpperCase();

    return ACTION_LABELS[normalized] || action;
};

const getActionClass = (action) => {
    const normalized = String(action || '').toUpperCase();

    if (['CREATE', 'LOGIN', 'BORROW', 'APPROVE', 'UNLOCK'].includes(normalized)) {
        return 'activity-badge-success';
    }

    if (['DELETE', 'REJECT', 'LOCK'].includes(normalized)) {
        return 'activity-badge-danger';
    }

    if (['UPDATE', 'RETURN'].includes(normalized)) {
        return 'activity-badge-info';
    }

    return 'activity-badge-default';
};

const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
};

const getActorName = (item) =>
    item.actorName ||
    item.username ||
    item.userName ||
    item.fullName ||
    item.account?.fullName ||
    item.account?.username ||
    'Hệ thống';

const getTargetName = (item) =>
    item.targetName ||
    item.entityName ||
    item.resourceName ||
    item.target ||
    item.entity ||
    '—';

const getDescription = (item) =>
    item.description ||
    item.details ||
    item.message ||
    item.actionDescription ||
    'Không có mô tả';

const normalizeLogs = (response) => {
    const payload = response?.data ?? response;

    if (Array.isArray(payload)) {
        return payload;
    }

    if (Array.isArray(payload?.content)) {
        return payload.content;
    }

    if (Array.isArray(payload?.items)) {
        return payload.items;
    }

    if (Array.isArray(payload?.logs)) {
        return payload.logs;
    }

    return [];
};

function ActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    const fetchLogs = async () => {
        setLoading(true);
        setError('');

        try {
            const data = await activityLogService.getActivityLogs();

            setLogs(normalizeLogs(data));
            setPage(1);
        } catch (err) {
            console.error('Lỗi tải nhật ký hoạt động:', err);

            setError(
                err.message || 'Không thể tải nhật ký hoạt động.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const filteredLogs = useMemo(() => {
        const search = keyword.trim().toLowerCase();

        return logs.filter((item) => {
            const actor = getActorName(item).toLowerCase();
            const target = getTargetName(item).toLowerCase();
            const description = getDescription(item).toLowerCase();
            const action = String(item.action || item.actionType || '').toUpperCase();

            const matchesKeyword =
                !search ||
                actor.includes(search) ||
                target.includes(search) ||
                description.includes(search) ||
                action.includes(search) ||
                String(item.id ?? '').toLowerCase().includes(search);

            const matchesAction =
                actionFilter === 'ALL' || action === actionFilter;

            const timestamp =
                item.createdAt ||
                item.timestamp ||
                item.created_at ||
                item.time;

            const logDate = timestamp ? new Date(timestamp) : null;

            const matchesFrom =
                !dateFrom ||
                (logDate &&
                    !Number.isNaN(logDate.getTime()) &&
                    logDate >= new Date(`${dateFrom}T00:00:00`));

            const matchesTo =
                !dateTo ||
                (logDate &&
                    !Number.isNaN(logDate.getTime()) &&
                    logDate <= new Date(`${dateTo}T23:59:59.999`));

            return (
                matchesKeyword &&
                matchesAction &&
                matchesFrom &&
                matchesTo
            );
        });
    }, [logs, keyword, actionFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    const currentPage = Math.min(page, totalPages);

    const paginatedLogs = filteredLogs.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    useEffect(() => {
        setPage(1);
    }, [keyword, actionFilter, dateFrom, dateTo]);

    const resetFilters = () => {
        setKeyword('');
        setActionFilter('ALL');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const getTimestamp = (item) =>
        item.createdAt ||
        item.timestamp ||
        item.created_at ||
        item.time;

    const getAction = (item) => item.action || item.actionType || '';

    return (
        <div className="activity-page">
            <div className="activity-page-header">
                <div>
                    <h1 className="activity-heading">Nhật ký hoạt động</h1>
                    <p className="activity-subtitle">
                        Theo dõi lịch sử thao tác trên hệ thống BK Library.
                    </p>
                </div>

                <button
                    type="button"
                    className="activity-refresh-button"
                    onClick={fetchLogs}
                    disabled={loading}
                >
                    ↻ {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
            </div>

            <div className="activity-summary">
                <div className="activity-summary-card">
                    <span className="activity-summary-icon">📋</span>
                    <div>
                        <p>Tổng nhật ký</p>
                        <strong>{logs.length.toLocaleString('vi-VN')}</strong>
                    </div>
                </div>

                <div className="activity-summary-card">
                    <span className="activity-summary-icon">🔎</span>
                    <div>
                        <p>Kết quả tìm kiếm</p>
                        <strong>
                            {filteredLogs.length.toLocaleString('vi-VN')}
                        </strong>
                    </div>
                </div>
            </div>

            <section className="activity-panel">
                <div className="activity-panel-header">
                    <div>
                        <h2>Lịch sử thao tác</h2>
                        <p>Tìm kiếm và lọc các hoạt động đã ghi nhận.</p>
                    </div>
                </div>

                <div className="activity-filters">
                    <div className="activity-field activity-search-field">
                        <label htmlFor="activity-keyword">Tìm kiếm</label>
                        <input
                            id="activity-keyword"
                            type="text"
                            placeholder="Tên người dùng, hành động, nội dung..."
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                        />
                    </div>

                    <div className="activity-field">
                        <label htmlFor="activity-action">Loại hoạt động</label>
                        <select
                            id="activity-action"
                            value={actionFilter}
                            onChange={(event) => setActionFilter(event.target.value)}
                        >
                            <option value="ALL">Tất cả hoạt động</option>
                            {Object.entries(ACTION_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="activity-field">
                        <label htmlFor="activity-date-from">Từ ngày</label>
                        <input
                            id="activity-date-from"
                            type="date"
                            value={dateFrom}
                            max={dateTo || undefined}
                            onChange={(event) => setDateFrom(event.target.value)}
                        />
                    </div>

                    <div className="activity-field">
                        <label htmlFor="activity-date-to">Đến ngày</label>
                        <input
                            id="activity-date-to"
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(event) => setDateTo(event.target.value)}
                        />
                    </div>

                    <button
                        type="button"
                        className="activity-reset-button"
                        onClick={resetFilters}
                    >
                        Xóa bộ lọc
                    </button>
                </div>

                {error && (
                    <div className="activity-error" role="alert">
                        <span>{error}</span>
                        <button type="button" onClick={fetchLogs}>
                            Thử lại
                        </button>
                    </div>
                )}

                <div className="activity-table-wrapper">
                    <table className="activity-table">
                        <thead>
                            <tr>
                                <th>Thời gian</th>
                                <th>Người thực hiện</th>
                                <th>Hoạt động</th>
                                <th>Đối tượng</th>
                                <th>Chi tiết</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="activity-empty">
                                        <span className="activity-spinner" />
                                        Đang tải nhật ký hoạt động...
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan="5" className="activity-empty">
                                        Không thể hiển thị dữ liệu.
                                    </td>
                                </tr>
                            ) : paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="activity-empty">
                                        Không tìm thấy nhật ký phù hợp.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((item, index) => {
                                    const action = getAction(item);

                                    return (
                                        <tr key={item.id ?? item.logId ?? index}>
                                            <td className="activity-time">
                                                {formatDate(getTimestamp(item))}
                                            </td>

                                            <td>
                                                <div className="activity-actor">
                                                    <span className="activity-actor-avatar">
                                                        {getActorName(item)
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>
                                                    <span>
                                                        {getActorName(item)}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`activity-badge ${getActionClass(action)}`}
                                                >
                                                    {getActionLabel(action)}
                                                </span>
                                            </td>

                                            <td>{getTargetName(item)}</td>

                                            <td className="activity-description">
                                                {getDescription(item)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && !error && filteredLogs.length > 0 && (
                    <div className="activity-pagination">
                        <span>
                            Hiển thị{' '}
                            {(currentPage - 1) * PAGE_SIZE + 1}
                            {'–'}
                            {Math.min(
                                currentPage * PAGE_SIZE,
                                filteredLogs.length
                            )}{' '}
                            trong {filteredLogs.length} bản ghi
                        </span>

                        <div className="activity-pagination-controls">
                            <button
                                type="button"
                                disabled={currentPage === 1}
                                onClick={() => setPage((value) => value - 1)}
                            >
                                ← Trước
                            </button>

                            <span>
                                Trang {currentPage} / {totalPages}
                            </span>

                            <button
                                type="button"
                                disabled={currentPage >= totalPages}
                                onClick={() => setPage((value) => value + 1)}
                            >
                                Sau →
                            </button>
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}

export default ActivityLogs;