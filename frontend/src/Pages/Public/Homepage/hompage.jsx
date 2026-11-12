import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BookCard from '../../../Component/Books/BookCard';
import bookService from '../../../Services/bookService';
import { apiRequest, unwrapData } from '../../../Services/apiClient';

import './homepage.css';
import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';

const QUICK_ACTIONS = [
    {
        icon: '⌕',
        title: 'Tra cứu sách',
        description: 'Tìm kiếm và khám phá các đầu sách',
        to: '/search',
        color: 'blue',
    },
    {
        icon: '▤',
        title: 'Đăng ký mượn',
        description: 'Đơn giản, nhanh chóng và tiện lợi',
        to: '/cart',
        color: 'green',
    },
    {
        icon: '◷',
        title: 'Theo dõi mượn trả',
        description: 'Xem lịch sử và hạn trả sách của bạn',
        to: '/my-borrowings',
        color: 'orange',
    },
    {
        icon: '♙',
        title: 'Tài khoản cá nhân',
        description: 'Quản lý thông tin tài khoản',
        to: '/my-borrowings',
        color: 'purple',
    },
    {
        icon: '♧',
        title: 'Hỗ trợ',
        description: 'Liên hệ với thư viện khi cần',
        to: '/support',
        color: 'cyan',
    },
];

const CATEGORY_COLORS = [
    'blue',
    'green',
    'purple',
    'orange',
    'pink',
    'cyan',
];

const CATEGORY_ICONS = ['⚛', '▤', '▥', '♙', '♡', '◉'];

const SectionHeading = ({
    icon,
    title,
    linkTo,
    linkText = 'Xem tất cả',
}) => (
    <div className="home-section-heading">
        <h2>
            <span className="section-heading-icon">{icon}</span>
            {title}
        </h2>

        {linkTo && (
            <Link to={linkTo} className="section-view-all">
                {linkText} <span aria-hidden="true">→</span>
            </Link>
        )}
    </div>
);

const Homepage = () => {
    const navigate = useNavigate();

    const [keyword, setKeyword] = useState('');

    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);

    const [booksLoading, setBooksLoading] = useState(true);
    const [categoriesLoading, setCategoriesLoading] = useState(true);

    const [booksError, setBooksError] = useState('');
    const [categoriesError, setCategoriesError] = useState('');

    const [featuredOffset, setFeaturedOffset] = useState(0);

    // =========================
    // Load books from backend
    // =========================

    useEffect(() => {
        let cancelled = false;

        const loadBooks = async () => {
            setBooksLoading(true);
            setBooksError('');

            try {
                const result = await bookService.getBooks({
                    page: 1,
                    size: 8,
                    sort: 'title',
                });

                // Backend trả data.items theo thiết kế hiện tại.
                const items = Array.isArray(result)
                    ? result
                    : result?.items;

                if (!Array.isArray(items)) {
                    throw new Error(
                        'Dữ liệu sách từ backend không đúng định dạng.'
                    );
                }

                if (!cancelled) {
                    setBooks(items);
                }
            } catch (error) {
                if (!cancelled) {
                    setBooksError(
                        error.message || 'Không thể tải danh sách sách.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setBooksLoading(false);
                }
            }
        };

        loadBooks();

        return () => {
            cancelled = true;
        };
    }, []);

    // =========================
    // Load categories from backend
    // =========================

    useEffect(() => {
        let cancelled = false;

        const loadCategories = async () => {
            setCategoriesLoading(true);
            setCategoriesError('');

            try {
                const response = await apiRequest('/categories');
                const result = unwrapData(response);

                if (!Array.isArray(result)) {
                    throw new Error(
                        'Dữ liệu danh mục từ backend không đúng định dạng.'
                    );
                }

                if (!cancelled) {
                    setCategories(result);
                }
            } catch (error) {
                if (!cancelled) {
                    setCategoriesError(
                        error.message || 'Không thể tải danh mục.'
                    );
                }
            } finally {
                if (!cancelled) {
                    setCategoriesLoading(false);
                }
            }
        };

        loadCategories();

        return () => {
            cancelled = true;
        };
    }, []);

    // =========================
    // Search
    // =========================

    const handleSearch = (event) => {
        event.preventDefault();

        const query = keyword.trim();

        navigate(
            query
                ? `/search?q=${encodeURIComponent(query)}`
                : '/search'
        );
    };

    const handleCategoryClick = (category) => {
        const categoryName =
            typeof category === 'string'
                ? category
                : category.name;

        navigate(
            `/search?category=${encodeURIComponent(categoryName)}`
        );
    };

    // =========================
    // Featured books carousel
    // =========================

    const handleFeaturedMove = (direction) => {
        setFeaturedOffset((current) => {
            if (books.length === 0) {
                return 0;
            }

            return (
                (current + direction + books.length) % books.length
            );
        });
    };

    const visibleBooks = books.length
        ? books.map(
              (_, index) =>
                  books[
                      (index + featuredOffset) % books.length
                  ]
          )
        : [];

    return (
        <div className="homepage">
            <Header/>
            <div className="homepage-container">
                {/* Hero */}
                <section className="home-hero">
                    <div className="hero-content">
                        <p className="hero-eyebrow">
                            Chào mừng bạn đến với
                        </p>

                        <h1>BK Library</h1>

                        <p className="hero-description">
                            Kho tri thức vô tận, đồng hành cùng hành trình
                            học tập và phát triển của bạn.
                        </p>

                        <form
                            className="hero-search"
                            onSubmit={handleSearch}
                        >
                            <span
                                className="hero-search-icon"
                                aria-hidden="true"
                            >
                                ⌕
                            </span>

                            <input
                                type="search"
                                value={keyword}
                                onChange={(event) =>
                                    setKeyword(event.target.value)
                                }
                                placeholder="Tìm sách, tác giả, ISBN..."
                                aria-label="Tìm kiếm sách, tác giả hoặc ISBN"
                            />

                            <button type="submit">
                                <span aria-hidden="true">⌕</span>
                                Tìm kiếm
                            </button>
                        </form>
                    </div>
                </section>

                {/* Quick actions */}
                <section
                    className="home-quick-actions"
                    aria-label="Truy cập nhanh"
                >
                    {QUICK_ACTIONS.map((action) => (
                        <Link
                            key={action.title}
                            to={action.to}
                            className="quick-action"
                        >
                            <span
                                className={`quick-action-icon ${action.color}`}
                                aria-hidden="true"
                            >
                                {action.icon}
                            </span>

                            <strong>{action.title}</strong>

                            <span className="quick-action-description">
                                {action.description}
                            </span>
                        </Link>
                    ))}
                </section>

                {/* Featured books */}
                <section className="home-section">
                    <SectionHeading
                        icon="☆"
                        title="Sách nổi bật"
                        linkTo="/search"
                    />

                    {booksLoading ? (
                        <p role="status">Đang tải danh sách sách...</p>
                    ) : booksError ? (
                        <div role="alert" className="home-error">
                            <p>{booksError}</p>
                            <button
                                type="button"
                                onClick={() => window.location.reload()}
                            >
                                Thử tải lại
                            </button>
                        </div>
                    ) : books.length === 0 ? (
                        <p>Hiện chưa có sách để hiển thị.</p>
                    ) : (
                        <div className="featured-books-wrapper">
                            {books.length > 1 && (
                                <button
                                    type="button"
                                    className="featured-arrow featured-arrow-left"
                                    aria-label="Xem sách trước đó"
                                    onClick={() =>
                                        handleFeaturedMove(-1)
                                    }
                                >
                                    ‹
                                </button>
                            )}

                            <div className="featured-books-grid">
                                {visibleBooks.map((book, index) => (
                                    <BookCard
                                        key={book.id ?? book.RecordID ?? index}
                                        book={{
                                            ...book,
                                            id: book.id ?? book.RecordID,
                                            title: book.title ?? book.Title,
                                            author: book.author ?? book.Author,
                                            category:
                                                book.category ?? book.Category,
                                            cover:
                                                book.cover_url ??
                                                book.coverUrl ??
                                                book.cover ??
                                                book.CoverImage ??
                                                book.Cover_URL ??
                                                '',
                                            availableCopies:
                                                book.availableCopies ?? 0,
                                        }}
                                    />
                                ))}
                            </div>

                            {books.length > 1 && (
                                <button
                                    type="button"
                                    className="featured-arrow featured-arrow-right"
                                    aria-label="Xem sách tiếp theo"
                                    onClick={() =>
                                        handleFeaturedMove(1)
                                    }
                                >
                                    ›
                                </button>
                            )}
                        </div>
                    )}
                </section>

                {/* Categories */}
                <section className="home-section home-categories-section">
                    <SectionHeading
                        icon="▦"
                        title="Danh mục"
                        linkTo="/search"
                    />

                    {categoriesLoading ? (
                        <p role="status">Đang tải danh mục...</p>
                    ) : categoriesError ? (
                        <p role="alert" className="home-error">
                            {categoriesError}
                        </p>
                    ) : categories.length === 0 ? (
                        <p>Hiện chưa có danh mục sách.</p>
                    ) : (
                        <div className="home-categories-grid">
                            {categories.map((category, index) => {
                                const name =
                                    category.name ?? category.Name;

                                const id =
                                    category.id ??
                                    category.CategoryID ??
                                    name;

                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className={`category-card ${
                                            CATEGORY_COLORS[
                                                index % CATEGORY_COLORS.length
                                            ]
                                        }`}
                                        onClick={() =>
                                            handleCategoryClick(name)
                                        }
                                    >
                                        <span
                                            className="category-icon"
                                            aria-hidden="true"
                                        >
                                            {
                                                CATEGORY_ICONS[
                                                    index %
                                                        CATEGORY_ICONS.length
                                                ]
                                            }
                                        </span>

                                        <span>{name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
            <Footer/>
        </div>
    );
};

export default Homepage;