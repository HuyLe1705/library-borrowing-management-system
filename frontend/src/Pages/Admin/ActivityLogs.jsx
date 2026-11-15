import React, { useEffect, useMemo, useState } from 'react';
import activityLogService from '../../Services/activityLogService';
import Pagination from '../../Component/common/Pagination';
import './AdminPages.css';

const PAGE_SIZE = 10;

const ACTION_LABELS = {
    CREATE: 'Tạo mới',
    CREATE_USER: 'Tạo người dùng',
    CREATE_FINE: 'Lập phiếu phạt',
    UPDATE: 'Cập nhật',
    UPDATE_USER: 'Cập nhật người dùng',
    CHANGE_ROLE: 'Đổi vai trò',
    CHANGE_STATUS: 'Đổi trạng thái',
    DELETE: 'Xóa',
    DELETE_USER: 'Xóa người dùng',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    BORROW: 'Mượn sách',
    BORROW_REQUEST: 'Yêu cầu mượn',
    RETURN: 'Trả sách',
    RENEW: 'Gia hạn',
    RENEWAL_REQUEST: 'Yêu cầu gia hạn',
    PAY_FINE: 'Thu tiền phạt',
    APPROVE: 'Phê duyệt',
    APPROVED_REQUEST: 'Duyệt yêu cầu mượn',
    APPROVED_RENEWAL: 'Duyệt gia hạn',
    FULFILLED_REQUEST: 'Bàn giao sách',
    REJECT: 'Từ chối',
    REJECTED_REQUEST: 'Từ chối yêu cầu mượn',
    REJECTED_RENEWAL: 'Từ chối gia hạn',
    CANCEL_REQUEST: 'Hủy yêu cầu mượn',
    CANCELLED_REQUEST: 'Hủy yêu cầu mượn',
    CANCELLED_RENEWAL: 'Hủy gia hạn',
    LOCK: 'Khóa tài khoản',
    UNLOCK: 'Mở khóa tài khoản',
};

const FILTER_ACTION_OPTIONS = {
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    BORROW: 'Mượn sách',
    RETURN: 'Trả sách',
    RENEW: 'Gia hạn',
    PAY_FINE: 'Thu tiền phạt',
    APPROVE: 'Phê duyệt',
    REJECT: 'Từ chối',
    CHANGE_ROLE: 'Đổi vai trò',
    CHANGE_STATUS: 'Đổi trạng thái',
};

const getActionLabel = (action) => {
    if (!action) return 'Không xác định';

    const normalized = String(action).toUpperCase();

    return ACTION_LABELS[normalized] || action;
};

const getActionClass = (action) => {
    const normalized = String(action || '').toUpperCase();

    if (
        ['CREATE', 'LOGIN', 'BORROW', 'APPROVE', 'UNLOCK', 'FULFILLED', 'PAY_FINE'].some(
            (prefix) => normalized === prefix || normalized.startsWith(prefix)
        )
    ) {
        return 'activity-badge-success';
    }

    if (
        ['DELETE', 'REJECT', 'LOCK', 'CANCEL'].some(
            (prefix) => normalized === prefix || normalized.startsWith(prefix)
        )
    ) {
        return 'activity-badge-danger';
    }

    if (
        ['UPDATE', 'RETURN', 'RENEW', 'CHANGE'].some(
            (prefix) => normalized === prefix || normalized.startsWith(prefix)
        )
    ) {
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
    (item.targetType
        ? `${item.targetType}${item.targetId ? ` #${item.targetId}` : ''}`
        : '—');

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
    const [totalLogsCount, setTotalLogsCount] = useState(0);
    const [serverPagination, setServerPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [actionFilter, setActionFilter] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    const fetchLogs = async (
        targetPage = page,
        searchKeyword = keyword,
        selectedAction = actionFilter,
        fromDate = dateFrom,
        toDate = dateTo
    ) => {
        setLoading(true);
        setError('');

        try {
            const trimmedKeyword = searchKeyword.trim();
            const actionParam = selectedAction === 'ALL' ? undefined : selectedAction;

            const data = await activityLogService.getActivityLogs({
                page: targetPage,
                size: PAGE_SIZE,
                keyword: trimmedKeyword || undefined,
                action: actionParam,
                from: fromDate || undefined,
                to: toDate || undefined,
            });

            const list = normalizeLogs(data);
            setLogs(list);

            const paginationData = (data?.data ?? data)?.pagination;
            if (paginationData) {
                const total = Number(paginationData.total ?? list.length);
                const size = Number(paginationData.size ?? PAGE_SIZE);
                const totalPages = Math.max(
                    1,
                    Number(paginationData.totalPages ?? Math.ceil(total / size))
                );
                const resolvedPage = Math.min(Number(paginationData.page ?? targetPage), totalPages);

                setServerPagination({
                    page: resolvedPage,
                    size,
                    total,
                    totalPages,
                });

                if (resolvedPage !== targetPage) {
                    setPage(resolvedPage);
                }

                if (!trimmedKeyword && !actionParam && !fromDate && !toDate) {
                    setTotalLogsCount(total);
                }
            } else {
                setServerPagination(null);
                setTotalLogsCount(list.length);
            }
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
        fetchLogs(page, keyword, actionFilter, dateFrom, dateTo);
    }, [page, keyword, actionFilter, dateFrom, dateTo]);

    const filteredLogs = useMemo(() => {
        if (serverPagination) {
            return logs;
        }

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
                actionFilter === 'ALL' ||
                action === actionFilter ||
                action.startsWith(actionFilter);

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
    }, [logs, keyword, actionFilter, dateFrom, dateTo, serverPagination]);

    const totalFiltered = serverPagination
        ? serverPagination.total
        : filteredLogs.length;

    const totalPages = serverPagination
        ? serverPagination.totalPages
        : Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));

    const currentPage = Math.min(page, totalPages);

    const paginatedLogs = serverPagination
        ? logs
        : filteredLogs.slice(
              (currentPage - 1) * PAGE_SIZE,
              currentPage * PAGE_SIZE
          );

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
                    onClick={() => fetchLogs(page, keyword, actionFilter, dateFrom, dateTo)}
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
                        <strong>{totalLogsCount.toLocaleString('vi-VN')}</strong>
                    </div>
                </div>

                <div className="activity-summary-card">
                    <span className="activity-summary-icon">🔎</span>
                    <div>
                        <p>Kết quả tìm kiếm</p>
                        <strong>
                            {totalFiltered.toLocaleString('vi-VN')}
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
                            onChange={(event) => {
                                setKeyword(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="activity-field">
                        <label htmlFor="activity-action">Loại hoạt động</label>
                        <select
                            id="activity-action"
                            value={actionFilter}
                            onChange={(event) => {
                                setActionFilter(event.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="ALL">Tất cả hoạt động</option>
                            {Object.entries(FILTER_ACTION_OPTIONS).map(([value, label]) => (
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
                            onChange={(event) => {
                                setDateFrom(event.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="activity-field">
                        <label htmlFor="activity-date-to">Đến ngày</label>
                        <input
                            id="activity-date-to"
                            type="date"
                            value={dateTo}
                            min={dateFrom || undefined}
                            onChange={(event) => {
                                setDateTo(event.target.value);
                                setPage(1);
                            }}
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
                        <button
                            type="button"
                            onClick={() => fetchLogs(page, keyword, actionFilter, dateFrom, dateTo)}
                        >
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

                {!loading && !error && totalFiltered > 0 && (
                    <Pagination
                        page={currentPage}
                        totalPages={totalPages}
                        total={totalFiltered}
                        size={PAGE_SIZE}
                        loading={loading}
                        onPageChange={setPage}
                    />
                )}
            </section>
        </div>
    );
}

export default ActivityLogs;