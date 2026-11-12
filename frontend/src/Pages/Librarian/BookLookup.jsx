import React, { useEffect, useState } from 'react';
import './LibrarianPages.css';

const API_URL = 'http://localhost:5000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function fetchBooks(search = '') {
    const params = new URLSearchParams();

    if (search.trim()) {
        params.set('search', search.trim());
    }

    const response = await fetch(
        `${API_URL}/books?${params.toString()}`,
        {
            headers: {
                Authorization: `Bearer ${getToken()}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error('Không thể tải danh sách sách.');
    }

    const result = await response.json();

    // Hỗ trợ một số dạng response API phổ biến
    const data = result.data ?? result;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data.books)) return data.books;
    if (Array.isArray(data.items)) return data.items;

    return [];
}

export default function BookLookup() {
    const [keyword, setKeyword] = useState('');
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadBooks = async (search = '') => {
        try {
            setLoading(true);
            setError('');

            const data = await fetchBooks(search);
            setBooks(data);
        } catch (err) {
            setError(err.message || 'Có lỗi khi tải dữ liệu.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadBooks();
    }, []);

    const handleSubmit = (event) => {
        event.preventDefault();
        loadBooks(keyword);
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
                    <span>{books.length} kết quả</span>
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
        </div>
    );
}