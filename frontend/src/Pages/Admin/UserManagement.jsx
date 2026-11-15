import React, { useCallback, useEffect, useMemo, useState } from 'react';
import userService from '../../Services/userService';
import Pagination from '../../Component/common/Pagination';
import './UserManagement.css';

const PAGE_SIZE = 10;

const getList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.users)) return data.users;
    return [];
};

function normalizeRole(role) {
    if (typeof role === 'string') {
        return role.toUpperCase().replace(/^ROLE_/, '');
    }

    if (role && typeof role === 'object') {
        return normalizeRole(
            role.name || role.roleName || role.authority || ''
        );
    }

    return '';
}

function getRoles(user) {
    const raw = [user.role, user.roles].flatMap((value) =>
        Array.isArray(value) ? value : value ? [value] : []
    );

    return [...new Set(raw.map(normalizeRole).filter(Boolean))];
}

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [keyword, setKeyword] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [serverPagination, setServerPagination] = useState(null);

    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadUsers = useCallback(async (targetPage = page, searchKeyword = keyword, selectedRole = roleFilter) => {
        setLoading(true);
        setError('');

        try {
            const trimmedKeyword = searchKeyword.trim();
            const roleParam = selectedRole === 'ALL' ? undefined : selectedRole;

            const data = await userService.getUsers({
                page: targetPage,
                size: PAGE_SIZE,
                keyword: trimmedKeyword || undefined,
                role: roleParam,
            });

            const list = getList(data);
            setUsers(list);

            if (data?.pagination) {
                const total = Number(data.pagination.total ?? list.length);
                const size = Number(data.pagination.size ?? PAGE_SIZE);
                const totalPages = Math.max(
                    1,
                    Number(data.pagination.totalPages ?? Math.ceil(total / size))
                );
                const resolvedPage = Math.min(Number(data.pagination.page ?? targetPage), totalPages);

                setServerPagination({
                    page: resolvedPage,
                    size,
                    total,
                    totalPages,
                });

                if (resolvedPage !== targetPage) {
                    setPage(resolvedPage);
                }

                if (!trimmedKeyword && !roleParam) {
                    setTotalAccounts(total);
                }
            } else {
                setServerPagination(null);
                setTotalAccounts(list.length);
            }
        } catch (err) {
            console.error('Lỗi tải danh sách người dùng:', err);
            setError(err.message || 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, [page, keyword, roleFilter]);

    useEffect(() => {
        loadUsers(page, keyword, roleFilter);
    }, [loadUsers, page, keyword, roleFilter]);

    // Lọc dữ liệu theo từ khóa và vai trò (dùng khi API trả mảng thuần không có server pagination)
    const filteredUsers = useMemo(() => {
        if (serverPagination) {
            return users;
        }

        const search = keyword.trim().toLowerCase();

        return users.filter((user) => {
            const searchText = [
                user.userCode,
                user.fullName,
                user.name,
                user.username,
                user.email,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            const matchesKeyword = searchText.includes(search);
            const roles = getRoles(user);
            const matchesRole =
                roleFilter === 'ALL' || roles.includes(roleFilter);

            return matchesKeyword && matchesRole;
        });
    }, [users, keyword, roleFilter, serverPagination]);

    // Tính toán phân trang
    const totalFiltered = serverPagination
        ? serverPagination.total
        : filteredUsers.length;

    const totalPages = serverPagination
        ? serverPagination.totalPages
        : Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));

    const currentPage = Math.min(page, totalPages);

    const paginatedUsers = useMemo(() => {
        if (serverPagination) {
            return users;
        }

        const start = (currentPage - 1) * PAGE_SIZE;

        return filteredUsers.slice(start, start + PAGE_SIZE);
    }, [users, filteredUsers, currentPage, serverPagination]);

    const handleRefresh = async () => {
        setPage(1);
        setSuccess('');
        await loadUsers(1, keyword, roleFilter);
    };

    const updateRole = async (user, newRole) => {
        const id = user.id ?? user.userId;

        if (id == null) {
            setError('Người dùng này không có ID hợp lệ.');
            return;
        }

        const currentRoles = getRoles(user);

        if (currentRoles.length === 1 && currentRoles[0] === newRole) {
            return;
        }

        const displayName =
            user.fullName || user.name || user.username || `#${id}`;

        if (
            !window.confirm(
                `Bạn có chắc muốn đổi vai trò của ${displayName} thành ${newRole}?`
            )
        ) {
            return;
        }

        setSavingId(id);
        setError('');
        setSuccess('');

        try {
            await userService.updateUserRole(id, newRole);
            await loadUsers();
            setSuccess(`Đã cập nhật vai trò cho ${displayName}.`);
        } catch (err) {
            setError(err.message || 'Không thể cập nhật vai trò.');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <main className="user-management">
            <header className="um-header">
                <div className="um-heading">
                    <span className="um-eyebrow">QUẢN TRỊ HỆ THỐNG</span>

                    <h1>Quản lý người dùng</h1>

                    <p>
                        Quản lý tài khoản, tra cứu thông tin và phân quyền
                        truy cập hệ thống BK Library.
                    </p>
                </div>

                <button
                    type="button"
                    className="um-button um-button-primary"
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    <span className={loading ? 'um-spin' : ''}>↻</span>
                    {loading ? 'Đang tải...' : 'Làm mới dữ liệu'}
                </button>
            </header>

            <section className="um-stats">
                <article className="um-stat-card">
                    <div className="um-stat-icon um-icon-blue">♙</div>
                    <div className="um-stat-content">
                        <span>Tổng tài khoản</span>
                        <strong>{totalAccounts.toLocaleString('vi-VN')}</strong>
                        <small>Tất cả người dùng</small>
                    </div>
                </article>

                <article className="um-stat-card">
                    <div className="um-stat-icon um-icon-purple">⌕</div>
                    <div className="um-stat-content">
                        <span>Kết quả hiện tại</span>
                        <strong>
                            {totalFiltered.toLocaleString('vi-VN')}
                        </strong>
                        <small>Theo điều kiện lọc</small>
                    </div>
                </article>

                <article className="um-stat-card">
                    <div className="um-stat-icon um-icon-green">▤</div>
                    <div className="um-stat-content">
                        <span>Số trang</span>
                        <strong>{currentPage}/{totalPages}</strong>
                        <small>{PAGE_SIZE} tài khoản mỗi trang</small>
                    </div>
                </article>
            </section>

            {error && (
                <div className="um-alert um-alert-error" role="alert">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError('')}
                        aria-label="Đóng thông báo lỗi"
                    >
                        ×
                    </button>
                </div>
            )}

            {success && (
                <div className="um-alert um-alert-success" role="status">
                    <span>{success}</span>
                    <button
                        type="button"
                        onClick={() => setSuccess('')}
                        aria-label="Đóng thông báo thành công"
                    >
                        ×
                    </button>
                </div>
            )}

            <section className="um-panel">
                <div className="um-panel-heading">
                    <div>
                        <h2>Danh sách tài khoản</h2>
                        <p>
                            Tìm kiếm và thay đổi vai trò của người dùng.
                        </p>
                    </div>

                    <span className="um-total-badge">
                        {totalFiltered.toLocaleString('vi-VN')} tài khoản
                    </span>
                </div>

                <div className="um-toolbar">
                    <label className="um-search">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            value={keyword}
                            onChange={(event) => {
                                setKeyword(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Tìm theo họ tên, username, email..."
                            aria-label="Tìm kiếm người dùng"
                        />

                        {keyword && (
                            <button
                                type="button"
                                onClick={() => {
                                    setKeyword('');
                                    setPage(1);
                                }}
                                aria-label="Xóa từ khóa"
                            >
                                ×
                            </button>
                        )}
                    </label>

                    <label className="um-role-filter">
                        <span>Vai trò</span>
                        <select
                            value={roleFilter}
                            onChange={(event) => {
                                setRoleFilter(event.target.value);
                                setPage(1);
                            }}
                            aria-label="Lọc theo vai trò"
                        >
                            <option value="ALL">Tất cả vai trò</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="LIBRARIAN">LIBRARIAN</option>
                            <option value="LECTURER">LECTURER</option>
                            <option value="STUDENT">STUDENT</option>
                        </select>
                    </label>
                </div>

                <div className="um-table-wrap">
                    <table className="um-table">
                        <thead>
                            <tr>
                                <th>NGƯỜI DÙNG</th>
                                <th>USERNAME</th>
                                <th>EMAIL</th>
                                <th>VAI TRÒ HIỆN TẠI</th>
                                <th className="um-action-heading">PHÂN QUYỀN</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="um-state">
                                            <span className="um-loader" />
                                            <span>Đang tải danh sách người dùng...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="5">
                                        <div className="um-state um-empty">
                                            <span className="um-empty-icon">⌕</span>
                                            <strong>Không tìm thấy người dùng</strong>
                                            <span>
                                                Hãy thử từ khóa hoặc điều kiện lọc khác.
                                            </span>
                                            {(keyword || roleFilter !== 'ALL') && (
                                                <button
                                                    type="button"
                                                    className="um-button"
                                                    onClick={() => {
                                                        setKeyword('');
                                                        setRoleFilter('ALL');
                                                        setPage(1);
                                                    }}
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedUsers.map((user, index) => {
                                    const id = user.id ?? user.userId;
                                    const roles = getRoles(user);
                                    const selectedRole = roles[0] || 'STUDENT';
                                    const displayName =
                                        user.fullName || user.name || 'Chưa cập nhật';
                                    const isSaving = savingId === id;

                                    return (
                                        <tr key={id ?? index}>
                                            <td>
                                                <div className="um-user-cell">
                                                    <span className="um-avatar">
                                                        {displayName
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </span>

                                                    <div className="um-user-info">
                                                        <strong>{displayName}</strong>
                                                        <span>
                                                            ID: {id ?? '—'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td>
                                                <span className="um-username">
                                                    {user.username || '—'}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="um-email">
                                                    {user.email || '—'}
                                                </span>
                                            </td>

                                            <td>
                                                {roles.length ? (
                                                    <div className="um-role-badges">
                                                        {roles.map((role) => (
                                                            <span
                                                                key={role}
                                                                className={`um-role-badge um-role-${role.toLowerCase()}`}
                                                            >
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="um-unassigned">
                                                        Chưa gán vai trò
                                                    </span>
                                                )}
                                            </td>

                                            <td>
                                                <div className="um-permission-cell">
                                                    <select
                                                        className="um-role-select"
                                                        value={selectedRole}
                                                        disabled={isSaving || loading}
                                                        onChange={(event) =>
                                                            updateRole(
                                                                user,
                                                                event.target.value
                                                            )
                                                        }
                                                        aria-label={`Đổi vai trò cho ${user.username || id}`}
                                                    >
                                                        <option value="STUDENT">STUDENT</option>
                                                        <option value="LECTURER">LECTURER</option>
                                                        <option value="LIBRARIAN">LIBRARIAN</option>
                                                        <option value="ADMIN">ADMIN</option>
                                                    </select>

                                                    {isSaving && (
                                                        <span className="um-saving">
                                                            Đang lưu...
                                                        </span>
                                                    )}
                                                </div>
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
        </main>
    );
}

export default UserManagement;