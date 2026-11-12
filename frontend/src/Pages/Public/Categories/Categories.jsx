import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import categoryService from '../../../Services/categoryService';
import './categories.css';
import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';

const CATEGORY_STYLES = [
    { icon: '⌘', color: 'blue' },
    { icon: '∑', color: 'purple' },
    { icon: '▤', color: 'green' },
    { icon: '✎', color: 'orange' },
    { icon: '◎', color: 'pink' },
    { icon: '⌂', color: 'cyan' },
    { icon: '◇', color: 'yellow' },
    { icon: '✦', color: 'indigo' },
];

const getCategoryName = (category) =>
    category.name ||
    category.categoryName ||
    category.category ||
    category.title ||
    'Chưa phân loại';

const getCategoryId = (category) =>
    category.id ??
    category.categoryId ??
    category.code;

const getCategoryDescription = (category) =>
    category.description ||
    category.note ||
    'Khám phá các đầu sách thuộc danh mục này tại BK Library.';

const getBookCount = (category) => {
    const count =
        category.bookCount ??
        category.totalBooks ??
        category.numberOfBooks ??
        category.booksCount;

    return Number.isFinite(Number(count)) ? Number(count) : null;
};

const getCategoryList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.content)) return data.content;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data?.data)) return data.data;

    return [];
};

function Categories() {
    const [categories, setCategories] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const loadCategories = async () => {
        setLoading(true);
        setError('');

        try {
            const data = await categoryService.getCategories();
            setCategories(getCategoryList(data));
        } catch (err) {
            console.error('Lỗi tải danh mục sách:', err);
            setError(
                err.message || 'Không thể tải danh mục sách.'
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCategories();
    }, []);

    const filteredCategories = useMemo(() => {
        const normalizedKeyword = keyword.trim().toLocaleLowerCase('vi');

        if (!normalizedKeyword) return categories;

        return categories.filter((category) => {
            const searchableText = [
                getCategoryName(category),
                getCategoryDescription(category),
            ]
                .join(' ')
                .toLocaleLowerCase('vi');

            return searchableText.includes(normalizedKeyword);
        });
    }, [categories, keyword]);

    return (
        <main className="categories-page">
            <Header/>
            {/* Hero */}
            <section className="categories-hero">
                <div className="categories-hero-content">
                    <div className="categories-eyebrow">
                        <span className="categories-eyebrow-dot" />
                        KHÔNG GIAN TRI THỨC BK LIBRARY
                    </div>

                    <h1>
                        Khám phá thế giới
                        <br />
                        <span>qua từng trang sách.</span>
                    </h1>

                    <p>
                        Tìm kiếm nguồn tri thức phù hợp với bạn.
                        Khám phá các danh mục sách và bắt đầu hành trình
                        học tập, nghiên cứu ngay hôm nay.
                    </p>

                    <div className="categories-hero-actions">
                        <Link
                            to="/search"
                            className="categories-primary-link"
                        >
                            Khám phá sách
                            <span aria-hidden="true">→</span>
                        </Link>

                        <a
                            href="#category-list"
                            className="categories-secondary-link"
                        >
                            Xem danh mục
                        </a>
                    </div>

                    <div className="categories-hero-note">
                        <span className="categories-note-icon">✦</span>
                        <span>
                            Mở rộng kiến thức, khơi nguồn sáng tạo.
                        </span>
                    </div>
                </div>

                <div
                    className="categories-hero-visual"
                    aria-hidden="true"
                >
                    <div className="categories-orbit orbit-one" />
                    <div className="categories-orbit orbit-two" />

                    <div className="categories-book book-back">
                        <span>KNOWLEDGE</span>
                    </div>

                    <div className="categories-book book-middle">
                        <span>DISCOVER</span>
                    </div>

                    <div className="categories-book book-front">
                        <div className="book-front-mark">BK</div>
                        <span>THE WORLD<br />OF KNOWLEDGE</span>
                        <small>READ · LEARN · GROW</small>
                    </div>

                    <div className="categories-floating floating-top">
                        <span>✦</span>
                        Tri thức
                    </div>

                    <div className="categories-floating floating-bottom">
                        <span>↗</span>
                        Khám phá mỗi ngày
                    </div>
                </div>
            </section>

            {/* Heading */}
            <section
                className="categories-content"
                id="category-list"
            >
                <div className="categories-section-heading">
                    <div>
                        <span className="categories-section-kicker">
                            EXPLORE COLLECTIONS
                        </span>

                        <h2>Khám phá danh mục</h2>

                        <p>
                            Chọn lĩnh vực bạn quan tâm và tìm cuốn sách
                            phù hợp với hành trình của mình.
                        </p>
                    </div>

                    <div className="categories-total">
                        <strong>{categories.length}</strong>
                        <span>Danh mục</span>
                    </div>
                </div>

                {/* Search */}
                <div className="categories-search">
                    <span
                        className="categories-search-icon"
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
                        placeholder="Tìm danh mục bạn quan tâm..."
                        aria-label="Tìm kiếm danh mục sách"
                    />

                    {keyword && (
                        <button
                            type="button"
                            className="categories-clear-search"
                            onClick={() => setKeyword('')}
                            aria-label="Xóa nội dung tìm kiếm"
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="categories-state">
                        <span className="categories-spinner" />
                        <p>Đang tải danh mục sách...</p>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="categories-state categories-state-error">
                        <div className="categories-state-icon">!</div>

                        <h3>Không thể tải danh mục</h3>
                        <p>{error}</p>

                        <button
                            type="button"
                            className="categories-retry"
                            onClick={loadCategories}
                        >
                            Thử lại
                        </button>
                    </div>
                )}

                {/* Empty */}
                {!loading && !error && categories.length === 0 && (
                    <div className="categories-state">
                        <div className="categories-state-icon">◇</div>
                        <h3>Chưa có danh mục sách</h3>
                        <p>
                            Danh mục sẽ xuất hiện tại đây khi có dữ liệu
                            từ thư viện.
                        </p>
                    </div>
                )}

                {/* No search result */}
                {!loading &&
                    !error &&
                    categories.length > 0 &&
                    filteredCategories.length === 0 && (
                        <div className="categories-state">
                            <div className="categories-state-icon">⌕</div>
                            <h3>Không tìm thấy danh mục phù hợp</h3>
                            <p>
                                Thử tìm bằng từ khóa khác hoặc xóa bộ lọc.
                            </p>
                        </div>
                    )}

                {/* Category cards */}
                {!loading && !error && filteredCategories.length > 0 && (
                    <div className="categories-grid">
                        {filteredCategories.map((category, index) => {
                            const id = getCategoryId(category);
                            const name = getCategoryName(category);
                            const description =
                                getCategoryDescription(category);
                            const bookCount = getBookCount(category);

                            const visual =
                                CATEGORY_STYLES[
                                    index % CATEGORY_STYLES.length
                                ];

                            const searchParams = new URLSearchParams();

                            if (id != null) {
                                searchParams.set('categoryId', String(id));
                            } else {
                                searchParams.set('category', name);
                            }

                            return (
                                <article
                                    className="category-card"
                                    key={id ?? name}
                                >
                                    <div className="category-card-top">
                                        <div
                                            className={`category-icon category-icon-${visual.color}`}
                                            aria-hidden="true"
                                        >
                                            {visual.icon}
                                        </div>

                                        <span className="category-card-number">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                    </div>

                                    <h3>{name}</h3>

                                    <p className="category-description">
                                        {description}
                                    </p>

                                    <div className="category-card-footer">
                                        <span className="category-book-count">
                                            {bookCount === null
                                                ? 'Khám phá sách'
                                                : `${bookCount.toLocaleString('vi-VN')} đầu sách`}
                                        </span>

                                        <Link
                                            to={`/search?${searchParams.toString()}`}
                                            className="category-view-link"
                                            aria-label={`Xem sách thuộc danh mục ${name}`}
                                        >
                                            <span aria-hidden="true">↗</span>
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {!loading && !error && categories.length > 0 && (
                    <div className="categories-results">
                        Hiển thị <strong>{filteredCategories.length}</strong>
                        {' '}trên <strong>{categories.length}</strong>
                        {' '}danh mục
                    </div>
                )}
            </section>

            {/* Bottom CTA */}
            <section className="categories-cta">
                <div className="categories-cta-symbol" aria-hidden="true">
                    BK
                </div>

                <div className="categories-cta-copy">
                    <span>HÀNH TRÌNH TRI THỨC CỦA BẠN</span>
                    <h2>Một cuốn sách hay có thể mở ra cả thế giới.</h2>
                    <p>
                        Tiếp tục khám phá kho tài liệu tại BK Library.
                    </p>
                </div>

                <Link
                    to="/search"
                    className="categories-cta-button"
                >
                    Tìm sách ngay
                    <span aria-hidden="true">→</span>
                </Link>
            </section>
            <Footer/>
        </main>
    );
}

export default Categories;