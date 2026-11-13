import React, { useEffect, useState } from 'react';
import './LibrarianPages.css';
import { getBooks } from '../../Services/bookService';
import Pagination from '../../Component/common/Pagination';

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function fetchBooks(keyword = '', page = 1, size = 10) {
    const response = await getBooks({
        page,
        size,
        keyword: keyword.trim() || undefined,
    });

    return {
        books: Array.isArray(response?.items) ? response.items : [],
        pagination: response?.pagination ?? {
            page,
            size,
            total: 0,
            totalPages: 0,
        },
    };
}

export default function BookLookup() {
    const [keyword, setKeyword] = useState('');
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        size: 10,
        total: 0,
        totalPages: 0,
    });

    async function loadBooks(search = keyword, page = 1) {
        try {
            setLoading(true);
            setError('');

            const result = await fetchBooks(search, page, pagination.size);

            setBooks(result.books);
            setPagination(result.pagination);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách sách.');
            setBooks([]);

            setPagination({
                page: 1,
                size: 10,
                total: 0,
                totalPages: 0,
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadBooks();
    }, []);

    const handleSubmit = (event) => {
        event.preventDefault();
        loadBooks(keyword, 1);
    };

    const getAvailability = (book) => {
        const available =
            book.availableQuantity ??
            book.availableCopies ??
            book.available;

        if (available !== undefined && available !== null) {
            return Number(available) > 0
                ? 'Còn sách'
                : 'Hết sách';
        }

        return book.status ?? 'Chưa xác định';
    };

    return (
        <div className="librarian-page">
            <div className="page-heading">
                <div>
                    <h1>Tra cứu sách</h1>
                    <p>
                        Tìm kiếm sách và kiểm tra tình trạng sách trong thư viện.
                    </p>
                </div>
            </div>

            <form className="search-form" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Nhập tên sách, mã sách hoặc mã vạch..."
                />

                <button type="submit" disabled={loading}>
                    {loading ? 'Đang tìm...' : 'Tìm kiếm'}
                </button>

                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                        setKeyword('');
                        loadBooks('');
                    }}
                >
                    Làm mới
                </button>
            </form>

            {error && <div className="error-message">{error}</div>}

            <div className="table-card">
                <div className="table-header">
                    <h2>Danh sách sách</h2>
                    <span>{pagination.total} kết quả</span>
                </div>

                <div className="table-responsive">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Mã sách</th>
                                <th>Tên sách</th>
                                <th>Tác giả</th>
                                <th>Thể loại</th>
                                <th>Tổng số</th>
                                <th>Có thể mượn</th>
                                <th>Tình trạng</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                        Đang tải dữ liệu...
                                    </td>
                                </tr>
                            ) : books.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="empty-state">
                                        Không tìm thấy sách.
                                    </td>
                                </tr>
                            ) : (
                                books.map((book, index) => {
                                    const id =
                                        book.id ??
                                        book.bookId ??
                                        book.bookCode ??
                                        index;

                                    const available =
                                        book.availableQuantity ??
                                        book.availableCopies ??
                                        book.available ??
                                        '—';

                                    return (
                                        <tr key={id}>
                                            <td>
                                                {book.bookCode ??
                                                    book.code ??
                                                    book.id ??
                                                    '—'}
                                            </td>

                                            <td className="primary-cell">
                                                {book.title ??
                                                    book.name ??
                                                    'Chưa có tên'}
                                            </td>

                                            <td>
                                                {book.author?.name ??
                                                    book.authorName ??
                                                    book.author ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {book.category?.name ??
                                                    book.categoryName ??
                                                    book.category ??
                                                    '—'}
                                            </td>

                                            <td>
                                                {book.totalQuantity ??
                                                    book.quantity ??
                                                    book.totalCopies ??
                                                    '—'}
                                            </td>

                                            <td>{available}</td>

                                            <td>
                                                <span
                                                    className={`status-badge ${
                                                        getAvailability(book) ===
                                                        'Còn sách'
                                                            ? 'status-success'
                                                            : getAvailability(book) ===
                                                                'Hết sách'
                                                              ? 'status-danger'
                                                              : 'status-neutral'
                                                    }`}
                                                >
                                                    {getAvailability(book)}
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
            <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                size={pagination.size}
                loading={loading}
                onPageChange={(nextPage) => loadBooks(keyword, nextPage)}
            />
        </div>
    );
}