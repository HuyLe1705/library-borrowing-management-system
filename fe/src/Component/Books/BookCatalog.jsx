
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BookCard from './BookCard';
import { getBooks } from './bookService';
import './BookCatalog.css';

const PAGE_SIZE = 8;

const BookCatalog = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [keyword, setKeyword] = useState(searchParams.get('q') || '');
    const [category, setCategory] = useState(
        searchParams.get('category') || ''
    );
    const [year, setYear] = useState('');
    const [availability, setAvailability] = useState('');
    const [sortBy, setSortBy] = useState('title-asc');
    const [page, setPage] = useState(1);

    useEffect(() => {
        let cancelled = false;

        const loadBooks = async () => {
            try {
                setLoading(true);
                setLoadError('');

                const result = await getBooks();

                if (!cancelled) {
                    setBooks(result);
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError('Không thể tải danh sách sách.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadBooks();

        return () => {
            cancelled = true;
        };
    }, []);

    // Đồng bộ bộ lọc tìm kiếm với URL.
    useEffect(() => {
        setKeyword(searchParams.get('q') || '');
        setCategory(searchParams.get('category') || '');
        setPage(1);
    }, [searchParams]);

    const categories = useMemo(
        () => [...new Set(books.map((book) => book.category).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'vi')),
        [books]
    );

    const years = useMemo(
        () => [...new Set(books.map((book) => book.publicationYear)
            .filter(Boolean))]
            .sort((a, b) => b - a),
        [books]
    );

    const filteredBooks = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLocaleLowerCase();

        const result = books.filter((book) => {
            const matchesKeyword =
                !normalizedKeyword ||
                [
                    book.title,
                    book.author,
                    book.isbn,
                ].some((value) =>
                    String(value || '')
                        .toLocaleLowerCase()
                        .includes(normalizedKeyword)
                );

            const matchesCategory =
                !category || book.category === category;

            const matchesYear =
                !year || String(book.publicationYear) === year;

            const isAvailable = Number(book.availableCopies) > 0;

            const matchesAvailability =
                !availability ||
                (availability === 'available' && isAvailable) ||
                (availability === 'unavailable' && !isAvailable);

            return (
                matchesKeyword &&
                matchesCategory &&
                matchesYear &&
                matchesAvailability
            );
        });

        return result.sort((a, b) => {
            switch (sortBy) {
                case 'title-desc':
                    return b.title.localeCompare(a.title, 'vi');
                case 'year-desc':
                    return (b.publicationYear || 0) -
                        (a.publicationYear || 0);
                case 'year-asc':
                    return (a.publicationYear || 0) -
                        (b.publicationYear || 0);
                default:
                    return a.title.localeCompare(b.title, 'vi');
            }
        });
    }, [books, keyword, category, year, availability, sortBy]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredBooks.length / PAGE_SIZE)
    );

    const currentPage = Math.min(page, totalPages);

    const paginatedBooks = filteredBooks.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
    );

    const handleSearch = (event) => {
        event.preventDefault();

        const nextParams = new URLSearchParams(searchParams);
        const query = keyword.trim();

        if (query) {
            nextParams.set('q', query);
        } else {
            nextParams.delete('q');
        }

        if (category) {
            nextParams.set('category', category);
        } else {
            nextParams.delete('category');
        }

        setSearchParams(nextParams);
        setPage(1);
    };

    const resetFilters = () => {
        setKeyword('');
        setCategory('');
        setYear('');
        setAvailability('');
        setSortBy('title-asc');
        setPage(1);
        setSearchParams({});
    };

    const changeFilter = (setter, value) => {
        setter(value);
        setPage(1);
    };

    return (
        <main className="catalog-page">
            <div className="catalog-container">
                <div className="catalog-breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <span>/</span>
                    <span>Tra cứu sách</span>
                </div>

                <header className="catalog-header">
                    <div>
                        <p className="catalog-eyebrow">BK LIBRARY</p>
                        <h1>Tra cứu sách</h1>
                        <p>
                            Tìm kiếm tài liệu và kiểm tra tình trạng sách
                            trong thư viện.
                        </p>
                    </div>

                    <div className="catalog-total">
                        <strong>{filteredBooks.length}</strong>
                        <span>Kết quả phù hợp</span>
                    </div>
                </header>

                <form className="catalog-search" onSubmit={handleSearch}>
                    <span className="catalog-search-icon" aria-hidden="true">
                        ⌕
                    </span>

                    <input
                        type="search"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Nhập tên sách, tác giả hoặc ISBN..."
                        aria-label="Từ khóa tìm kiếm"
                    />

                    <button type="submit">Tìm kiếm</button>
                </form>

                <div className="catalog-layout">
                    <aside className="catalog-filters">
                        <div className="catalog-filter-heading">
                            <h2>Bộ lọc</h2>
                            <button type="button" onClick={resetFilters}>
                                Xóa lọc
                            </button>
                        </div>

                        <div className="catalog-filter-group">
                            <label htmlFor="catalog-category">
                                Thể loại
                            </label>
                            <select
                                id="catalog-category"
                                value={category}
                                onChange={(event) =>
                                    changeFilter(setCategory, event.target.value)
                                }
                            >
                                <option value="">Tất cả thể loại</option>
                                {categories.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="catalog-filter-group">
                            <label htmlFor="catalog-year">
                                Năm xuất bản
                            </label>
                            <select
                                id="catalog-year"
                                value={year}
                                onChange={(event) =>
                                    changeFilter(setYear, event.target.value)
                                }
                            >
                                <option value="">Tất cả các năm</option>
                                {years.map((item) => (
                                    <option key={item} value={item}>
                                        {item}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="catalog-filter-group">
                            <label htmlFor="catalog-availability">
                                Tình trạng sách
                            </label>
                            <select
                                id="catalog-availability"
                                value={availability}
                                onChange={(event) =>
                                    changeFilter(
                                        setAvailability,
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">Tất cả tình trạng</option>
                                <option value="available">Còn sách</option>
                                <option value="unavailable">Hết sách</option>
                            </select>
                        </div>

                        <div className="catalog-filter-note">
                            <span aria-hidden="true">ⓘ</span>
                            Số lượng còn được tính theo các bản có thể mượn,
                            không phải tổng số đầu sách.
                        </div>
                    </aside>

                    <section className="catalog-results">
                        <div className="catalog-results-toolbar">
                            <p>
                                Hiển thị{' '}
                                <strong>
                                    {filteredBooks.length === 0
                                        ? 0
                                        : (currentPage - 1) * PAGE_SIZE + 1}
                                    {'–'}
                                    {Math.min(
                                        currentPage * PAGE_SIZE,
                                        filteredBooks.length
                                    )}
                                </strong>
                                {' '}trong{' '}
                                <strong>{filteredBooks.length}</strong> kết quả
                            </p>

                            <div className="catalog-sort">
                                <label htmlFor="catalog-sort">Sắp xếp:</label>
                                <select
                                    id="catalog-sort"
                                    value={sortBy}
                                    onChange={(event) =>
                                        changeFilter(
                                            setSortBy,
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="title-asc">Tên A–Z</option>
                                    <option value="title-desc">Tên Z–A</option>
                                    <option value="year-desc">Năm mới nhất</option>
                                    <option value="year-asc">Năm cũ nhất</option>
                                </select>
                            </div>
                        </div>

                        {loading ? (
                            <div className="catalog-state">
                                <span className="catalog-spinner" />
                                <p>Đang tải danh sách sách...</p>
                            </div>
                        ) : loadError ? (
                            <div className="catalog-state catalog-error">
                                <h3>Không thể tải dữ liệu</h3>
                                <p>{loadError}</p>
                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                >
                                    Thử lại
                                </button>
                            </div>
                        ) : paginatedBooks.length > 0 ? (
                            <div className="catalog-books-grid">
                                {paginatedBooks.map((book) => (
                                    <BookCard key={book.id} book={book} />
                                ))}
                            </div>
                        ) : (
                            <div className="catalog-empty">
                                <span aria-hidden="true">⌕</span>
                                <h3>Không tìm thấy sách phù hợp</h3>
                                <p>
                                    Hãy thử từ khóa khác hoặc điều chỉnh bộ lọc.
                                </p>
                                <button
                                    type="button"
                                    onClick={resetFilters}
                                >
                                    Xóa bộ lọc
                                </button>
                            </div>
                        )}

                        {!loading &&
                            !loadError &&
                            filteredBooks.length > PAGE_SIZE && (
                                <nav
                                    className="catalog-pagination"
                                    aria-label="Phân trang kết quả"
                                >
                                    <button
                                        type="button"
                                        disabled={currentPage === 1}
                                        onClick={() =>
                                            setPage((value) => value - 1)
                                        }
                                    >
                                        ← Trước
                                    </button>

                                    {Array.from(
                                        { length: totalPages },
                                        (_, index) => index + 1
                                    ).map((pageNumber) => (
                                        <button
                                            key={pageNumber}
                                            type="button"
                                            className={
                                                currentPage === pageNumber
                                                    ? 'active'
                                                    : ''
                                            }
                                            aria-current={
                                                currentPage === pageNumber
                                                    ? 'page'
                                                    : undefined
                                            }
                                            onClick={() => setPage(pageNumber)}
                                        >
                                            {pageNumber}
                                        </button>
                                    ))}

                                    <button
                                        type="button"
                                        disabled={currentPage === totalPages}
                                        onClick={() =>
                                            setPage((value) => value + 1)
                                        }
                                    >
                                        Sau →
                                    </button>
                                </nav>
                            )}
                    </section>
                </div>
            </div>
        </main>
    );
};

export default BookCatalog;
