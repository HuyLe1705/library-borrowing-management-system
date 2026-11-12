
import React, { useCallback, useEffect, useState } from 'react';
import userService from '../../Services/userService';

const styles = {
    page: { padding: 24, color: '#1f2937' },
    subtitle: { color: '#6b7280' },
    toolbar: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        margin: '20px 0',
    },
    input: {
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        minWidth: 200,
    },
    select: {
        padding: '10px 12px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        background: '#fff',
    },
    button: {
        padding: '9px 13px',
        border: '1px solid #d1d5db',
        borderRadius: 8,
        background: '#fff',
        cursor: 'pointer',
    },
    primaryButton: {
        padding: '9px 13px',
        border: 'none',
        borderRadius: 8,
        background: '#1d4ed8',
        color: '#fff',
        cursor: 'pointer',
    },
    panel: {
        padding: 20,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
    },
    tableWrap: { overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: 780 },
    cell: { padding: 12, textAlign: 'left', borderBottom: '1px solid #e5e7eb' },
    error: { color: '#b91c1c' },
};

const getList = (data) =>
    Array.isArray(data) ? data : data?.content || data?.items || [];

function normalizeRole(role) {
    if (typeof role === 'string') {
        return role.toUpperCase().replace(/^ROLE_/, '');
    }

    if (role && typeof role === 'object') {
        return normalizeRole(role.name || role.roleName || role.authority || '');
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
    const [keyword, setKeyword] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [error, setError] = useState('');

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await userService.getUsers();

            setUsers(
                Array.isArray(data)
                    ? data
                    : data?.content ?? data?.items ?? []
            );
        } catch (err) {
            console.error('Lỗi tải danh sách người dùng:', err);

            setError(
                err.message || 'Không thể tải danh sách người dùng.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadUsers();
    }, [loadUsers]);

    const filteredUsers = users.filter((user) => {
        const searchText = [
            user.fullName,
            user.username,
            user.email,
        ].join(' ').toLowerCase();

        const matchesKeyword = searchText.includes(keyword.trim().toLowerCase());
        const roles = getRoles(user);
        const matchesRole = roleFilter === 'ALL' || roles.includes(roleFilter);

        return matchesKeyword && matchesRole;
    });

    const updateRole = async (user, newRole) => {
        const id = user.id ?? user.userId;

        if (id == null) {
            setError('Người dùng này không có ID hợp lệ.');
            return;
        }

        const currentRoles = getRoles(user);
        if (currentRoles.length === 1 && currentRoles[0] === newRole) return;

        if (!window.confirm(
            `Bạn có chắc muốn đổi vai trò của ${user.fullName || user.username} thành ${newRole}?`
        )) {
            return;
        }

        setSavingId(id);
        setError('');

        try {
            await userService.updateUserRole(id, newRole);

            await loadUsers();
        } catch (err) {
            setError(err.message || 'Không thể cập nhật vai trò.');
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div style={styles.page}>
            <h1>Quản lý người dùng</h1>
            <p style={styles.subtitle}>
                Tra cứu tài khoản và quản lý vai trò truy cập hệ thống.
            </p>

            {error && <p role="alert" style={styles.error}>{error}</p>}

            <div style={styles.toolbar}>
                <input
                    style={styles.input}
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tìm tên, username, email..."
                    aria-label="Tìm kiếm người dùng"
                />

                <select
                    style={styles.select}
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    aria-label="Lọc theo vai trò"
                >
                    <option value="ALL">Tất cả vai trò</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USER</option>
                    <option value="LIBRARIAN">LIBRARIAN</option>
                </select>

                <button style={styles.button} onClick={loadUsers}>
                    Làm mới
                </button>
            </div>

            <section style={styles.panel}>
                <h2>Danh sách người dùng ({filteredUsers.length})</h2>

                {loading ? (
                    <p>Đang tải danh sách...</p>
                ) : filteredUsers.length === 0 ? (
                    <p>Không tìm thấy người dùng phù hợp.</p>
                ) : (
                    <div style={styles.tableWrap}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    {['Họ tên', 'Username', 'Email', 'Vai trò', 'Cập nhật vai trò'].map((label) => (
                                        <th key={label} style={styles.cell}>{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user, index) => {
                                    const id = user.id ?? user.userId;
                                    const roles = getRoles(user);
                                    const selectedRole = roles[0] || 'USER';

                                    return (
                                        <tr key={id ?? index}>
                                            <td style={styles.cell}>
                                                {user.fullName || user.name || '—'}
                                            </td>
                                            <td style={styles.cell}>
                                                {user.username || '—'}
                                            </td>
                                            <td style={styles.cell}>
                                                {user.email || '—'}
                                            </td>
                                            <td style={styles.cell}>
                                                {roles.length ? roles.join(', ') : 'Chưa gán'}
                                            </td>
                                            <td style={styles.cell}>
                                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                    <select
                                                        style={styles.select}
                                                        value={selectedRole}
                                                        disabled={savingId === id}
                                                        onChange={(event) => updateRole(user, event.target.value)}
                                                        aria-label={`Đổi vai trò cho ${user.username || id}`}
                                                    >
                                                        <option value="USER">USER</option>
                                                        <option value="ADMIN">ADMIN</option>
                                                        <option value="LIBRARIAN">LIBRARIAN</option>
                                                    </select>
                                                    {savingId === id && <span>Đang lưu...</span>}
                                                </div>
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

export default UserManagement;
