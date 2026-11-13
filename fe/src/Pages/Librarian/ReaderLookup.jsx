import React, { useEffect, useState } from 'react';
import { getUsers } from '../../Services/userService';
import Pagination from '../../Component/common/Pagination';
import './LibrarianPages.css';

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function fetchReaders(keyword = '', page = 1, size = 10) {
    const roles = ['STUDENT', 'LECTURER'];

    const results = await Promise.all(
        roles.map((role) =>
            getUsers({
                page,
                size,
                keyword: keyword.trim() || undefined,
                role,
                sort: 'fullName',
                order: 'ASC',
            })
        )
    );

    const readerLists = results.map((data) => {
        if (Array.isArray(data?.items)) return data.items;
        if (Array.isArray(data?.users)) return data.users;
        if (Array.isArray(data)) return data;
        return [];
    });

    const allReaders = readerLists.flat();

    return {
        readers: allReaders,
        pagination: {
            page,
            size,
            total: allReaders.length,
            totalPages: Math.ceil(allReaders.length / size),
        },
    };
}

export default function ReaderLookup() {
    const [keyword, setKeyword] = useState('');
    const [readers, setReaders] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        size: 10,
        total: 0,
        totalPages: 0,
    });

    const loadReaders = async (search = keyword, page = 1) => {
        try {
            setLoading(true);
            setError('');

            const result = await fetchReaders(search, page, pagination.size);

            setReaders(result.readers);
            setPagination(result.pagination);
        } catch (err) {
            setError(err.message || 'Có lỗi khi tải dữ liệu.');
            setReaders([]);
            setPagination({
                page: 1,
                size: 10,
                total: 0,
                totalPages: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReaders();
    }, []);

    const handleSubmit = (event) => {
        event.preventDefault();
        loadReaders(keyword);
    };

    const getReaderStatus = (reader) => {
        const status = String(
            reader.status ?? reader.accountStatus ?? ''
        ).toUpperCase();

        if (['ACTIVE', 'ACTIVATED', 'ENABLED'].includes(status)) {
            return { label: 'Hoạt động', className: 'status-success' };
        }

        if (
            ['INACTIVE', 'LOCKED', 'DISABLED', 'SUSPENDED'].includes(status)
        ) {
            return { label: 'Bị khóa / ngừng hoạt động', className: 'status-danger' };
        }

        return {
            label: reader.status ?? 'Chưa xác định',
            className: 'status-neutral',
        };
    };

    const getRoleLabel = (reader) => {
        const role = String(
            reader.role ?? reader.roles?.[0]?.name ?? ''
        ).toUpperCase();

        const roleLabels = {
            STUDENT: 'Sinh viên',
            LECTURER: 'Giảng viên',
            LIBRARIAN: 'Thủ thư',
            ADMIN: 'Quản trị viên',
        };

        return roleLabels[role] ?? role ?? '—';
    };

    const handlePageChange = (nextPage) => {
        loadReaders(keyword, nextPage);
    };

    return (
        <div className="librarian-page">
            <div className="page-heading">
                <div>
                    <h1>Tra cứu độc giả</h1>
                    <p>
                        Tìm kiếm thông tin độc giả trước khi xử lý mượn và trả sách.
                    </p>
                </div>
            </div>

            <form className="search-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Nhập mã độc giả, họ tên hoặc tài khoản..."
                />

                <button type="submit" disabled={loading}>
                    {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                        setKeyword('');
                        loadReaders('');
                    }}
                >
                    Làm mới
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            <div className="table-card">
                <div className="table-header">
                    <h2>Danh sách độc giả</h2>
                    <span>{readers.length} kết quả</span>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã độc giả</th>
                                <th>Họ và tên</th>
                                <th>Tài khoản</th>
                                <th>Email</th>
                                <th>Số điện thoại</th>
                                <th>Vai trò</th>
                                <th>Trạng thái</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : readers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                        Không tìm thấy độc giả.
                                    </td>
                                </tr>
                            ) : (
                                readers.map((reader, index) => {
                                    const id =
                                        reader.id ??
                                        reader.userId ??
                                        reader.userCode ??
                                        index;

                                    const status = getReaderStatus(reader);

                                    return (
                                        <tr key={id}>
                                            <td>
                                                {reader.userCode ??
                                                    reader.readerCode ??
                                                    reader.code ??
                                                    '—'}
                                            </td>

                                            <td className="primary-cell">
                                                {reader.fullName ??
                                                    reader.name ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {reader.username ?? '—'}
                                            </td>

                                            <td>{reader.email ?? '—'}</td>

                                            <td>{reader.phone ?? '—'}</td>

                                            <td>{getRoleLabel(reader)}</td>

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

                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        size={pagination.size}
                        loading={loading}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
        </div>
    );
}