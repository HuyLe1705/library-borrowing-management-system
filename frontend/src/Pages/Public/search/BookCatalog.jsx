import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';
import { getBooks } from '../../../Services/bookService';
import './BookCatalog.css';

const PAGE_SIZE = 9;

const getBookId = (book) =>
  book?.id ?? book?.bookId ?? book?.bookID ?? book?.isbn;

const getBookTitle = (book) =>
  book?.title ?? book?.bookTitle ?? book?.name ?? 'Chưa có tên sách';

const getBookAuthor = (book) =>
  book?.author ?? book?.authorName ?? book?.authors ?? 'Đang cập nhật';

const getBookCategory = (book) =>
  typeof book?.category === 'object'
    ? book.category?.name ?? book.category?.categoryName ?? ''
    : book?.category ?? book?.categoryName ?? book?.category_name ?? '';

const getBookYear = (book) =>
  book?.publicationYear ??
  book?.publishedYear ??
  book?.publishYear ??
  book?.publication_year ??
  '';

const getAvailableCopies = (book) =>
  Number(
    book?.availableCopies ??
    book?.available_copies ??
    book?.availableQuantity ??
    book?.quantityAvailable ??
    0
  );

const getCover = (book) =>
  book?.coverImage ??
  book?.coverUrl ??
  book?.imageUrl ??
  book?.image ??
  book?.thumbnail ??
  '';

const normalizeText = (value) =>
  String(value ?? '').trim().toLocaleLowerCase('vi');

function BookCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [keyword, setKeyword] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(
    searchParams.get('category') || ''
  );
  const [year, setYear] = useState('');
  const [availability, setAvailability] = useState('');
  const [sortBy, setSortBy] = useState('title-asc');
  const [page, setPage] = useState(1);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getBooks();

      // Hỗ trợ một số cấu trúc response API phổ biến.
      const result = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.content)
            ? response.content
            : Array.isArray(response?.items)
              ? response.items
              : Array.isArray(response?.books)
                ? response.books
                : [];

      setBooks(result);
    } catch (err) {
      console.error('Không thể tải danh sách sách:', err);
      setError('Không thể tải danh sách sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  useEffect(() => {
    setKeyword(searchParams.get('q') || '');
    setCategory(searchParams.get('category') || '');
    setPage(1);
  }, [searchParams]);

  const categories = useMemo(() => {
    return [
      ...new Set(books.map(getBookCategory).filter(Boolean)),
    ].sort((a, b) => a.localeCompare(b, 'vi'));
  }, [books]);

  const years = useMemo(() => {
    return [
      ...new Set(books.map(getBookYear).filter(Boolean).map(String)),
    ].sort((a, b) => Number(b) - Number(a));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const query = normalizeText(keyword);

    const result = books.filter((book) => {
      const searchableText = [
        getBookTitle(book),
        getBookAuthor(book),
        book?.isbn,
        book?.publisher,
        book?.description,
      ]
        .map(normalizeText)
        .join(' ');

      const matchesKeyword =
        !query || searchableText.includes(query);

      const matchesCategory =
        !category || getBookCategory(book) === category;

      const matchesYear =
        !year || String(getBookYear(book)) === year;

      const available = getAvailableCopies(book) > 0;

      const matchesAvailability =
        !availability ||
        (availability === 'available' && available) ||
        (availability === 'unavailable' && !available);

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
          return getBookTitle(b).localeCompare(getBookTitle(a), 'vi');

        case 'year-desc':
          return Number(getBookYear(b) || 0) -
            Number(getBookYear(a) || 0);

        case 'year-asc':
          return Number(getBookYear(a) || 0) -
            Number(getBookYear(b) || 0);

        default:
          return getBookTitle(a).localeCompare(
            getBookTitle(b),
            'vi'
          );
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

    const params = new URLSearchParams(searchParams);
    const query = keyword.trim();

    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }

    if (category) {
      params.set('category', category);
    } else {
      params.delete('category');
    }

    setSearchParams(params);
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

  const updateFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <Header />

      <main className="book-catalog">
        <section className="book-catalog__hero">
          <div className="book-catalog__hero-decoration book-catalog__hero-decoration--one" />
          <div className="book-catalog__hero-decoration book-catalog__hero-decoration--two" />

          <div className="book-catalog__container book-catalog__hero-inner">
            <div className="book-catalog__hero-content">
              <div className="book-catalog__eyebrow">
                <span />
                KHÔNG GIAN TRI THỨC BK LIBRARY
              </div>

              <h1>
                Tìm cuốn sách
                <br />
                <span>bạn đang cần.</span>
              </h1>

              <p>
                Khám phá kho sách, tìm kiếm tài liệu và tiếp cận
                những nguồn tri thức hữu ích cho học tập, nghiên cứu.
              </p>

              <form
                className="book-catalog__search"
                onSubmit={handleSearch}
              >
                <span
                  className="book-catalog__search-icon"
                  aria-hidden="true"
                >
                  ⌕
                </span>

                <input
                  type="search"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tên sách, tác giả, ISBN..."
                  aria-label="Tìm kiếm sách"
                />

                {keyword && (
                  <button
                    className="book-catalog__clear-search"
                    type="button"
                    onClick={() => setKeyword('')}
                    aria-label="Xóa từ khóa"
                  >
                    ×
                  </button>
                )}

                <button
                  className="book-catalog__search-button"
                  type="submit"
                >
                  Tìm kiếm
                </button>
              </form>

              <div className="book-catalog__hero-note">
                <span aria-hidden="true">✦</span>
                Tìm kiếm đơn giản, khám phá tri thức mỗi ngày.
              </div>
            </div>

            <div
              className="book-catalog__hero-art"
              aria-hidden="true"
            >
              <div className="book-catalog__art-circle" />

              <div className="book-catalog__art-book book-catalog__art-book--back">
                <span>KNOWLEDGE</span>
              </div>

              <div className="book-catalog__art-book book-catalog__art-book--middle">
                <span>EXPLORE</span>
              </div>

              <div className="book-catalog__art-book book-catalog__art-book--front">
                <span className="book-catalog__art-symbol">✳</span>
                <strong>THE WORLD<br />OF IDEAS</strong>
                <small>BK LIBRARY</small>
              </div>

              <div className="book-catalog__art-label">
                <span>✦</span>
                <div>
                  <strong>Knowledge</strong>
                  <small>Begins with a book</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="book-catalog__content">
          <div className="book-catalog__container">
            <div className="book-catalog__breadcrumb">
              <Link to="/">Trang chủ</Link>
              <span>/</span>
              <span>Tra cứu sách</span>
            </div>

            <div className="book-catalog__section-heading">
              <div>
                <span className="book-catalog__section-label">
                  KHÁM PHÁ KHO SÁCH
                </span>
                <h2>Tìm kiếm tài liệu</h2>
                <p>
                  Sử dụng bộ lọc để tìm nhanh những cuốn sách phù hợp.
                </p>
              </div>

              <div className="book-catalog__result-summary">
                <strong>{loading ? '—' : filteredBooks.length}</strong>
                <span>Kết quả phù hợp</span>
              </div>
            </div>

            <div className="book-catalog__layout">
              <aside className="book-catalog__filters">
                <div className="book-catalog__filter-heading">
                  <div>
                    <span className="book-catalog__filter-icon">☷</span>
                    <h3>Bộ lọc tìm kiếm</h3>
                  </div>

                  <button type="button" onClick={resetFilters}>
                    Đặt lại
                  </button>
                </div>

                <div className="book-catalog__filter-group">
                  <label htmlFor="book-category">Thể loại sách</label>
                  <select
                    id="book-category"
                    value={category}
                    onChange={(event) =>
                      updateFilter(setCategory, event.target.value)
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

                <div className="book-catalog__filter-group">
                  <label htmlFor="book-year">Năm xuất bản</label>
                  <select
                    id="book-year"
                    value={year}
                    onChange={(event) =>
                      updateFilter(setYear, event.target.value)
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

                <div className="book-catalog__filter-group">
                  <label htmlFor="book-availability">
                    Tình trạng sách
                  </label>
                  <select
                    id="book-availability"
                    value={availability}
                    onChange={(event) =>
                      updateFilter(setAvailability, event.target.value)
                    }
                  >
                    <option value="">Tất cả tình trạng</option>
                    <option value="available">Còn sách</option>
                    <option value="unavailable">Hết sách</option>
                  </select>
                </div>

                <div className="book-catalog__filter-tip">
                  <span aria-hidden="true">ⓘ</span>
                  <p>
                    Thông tin tình trạng sách phụ thuộc vào dữ liệu
                    số lượng bản sách do hệ thống cung cấp.
                  </p>
                </div>
              </aside>

              <section className="book-catalog__results">
                <div className="book-catalog__toolbar">
                  <p>
                    {loading
                      ? 'Đang tải danh sách sách...'
                      : (
                        <>
                          Tìm thấy{' '}
                          <strong>{filteredBooks.length}</strong> cuốn sách
                        </>
                      )}
                  </p>

                  <div className="book-catalog__sort">
                    <label htmlFor="book-sort">Sắp xếp</label>
                    <select
                      id="book-sort"
                      value={sortBy}
                      onChange={(event) =>
                        updateFilter(setSortBy, event.target.value)
                      }
                    >
                      <option value="title-asc">Tên A–Z</option>
                      <option value="title-desc">Tên Z–A</option>
                      <option value="year-desc">Mới nhất</option>
                      <option value="year-asc">Cũ nhất</option>
                    </select>
                  </div>
                </div>

                {loading ? (
                  <div className="book-catalog__state">
                    <span className="book-catalog__spinner" />
                    <h3>Đang khám phá kho sách</h3>
                    <p>Vui lòng đợi trong giây lát...</p>
                  </div>
                ) : error ? (
                  <div className="book-catalog__state book-catalog__state--error">
                    <span className="book-catalog__state-icon">!</span>
                    <h3>Chưa thể tải danh sách sách</h3>
                    <p>{error}</p>
                    <button type="button" onClick={loadBooks}>
                      Thử tải lại
                    </button>
                  </div>
                ) : paginatedBooks.length === 0 ? (
                  <div className="book-catalog__state">
                    <span className="book-catalog__empty-icon">⌕</span>
                    <h3>Chưa tìm thấy cuốn sách phù hợp</h3>
                    <p>
                      Thử từ khóa khác hoặc điều chỉnh bộ lọc
                      để mở rộng kết quả tìm kiếm.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                ) : (
                  <div className="book-catalog__grid">
                    {paginatedBooks.map((book, index) => {
                      const id = getBookId(book);
                      const title = getBookTitle(book);
                      const author = getBookAuthor(book);
                      const bookCategory = getBookCategory(book);
                      const cover = getCover(book);
                      const available = getAvailableCopies(book) > 0;

                      return (
                        <article
                          className="book-catalog-card"
                          key={id ?? `${title}-${index}`}
                        >
                          <div className="book-catalog-card__cover">
                            {cover ? (
                              <img
                                src={cover}
                                alt={`Bìa sách ${title}`}
                                loading="lazy"
                                onError={(event) => {
                                  event.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : null}

                            <div
                              className="book-catalog-card__cover-placeholder"
                              aria-hidden="true"
                            >
                              <span>BK</span>
                              <strong>{title}</strong>
                              <small>LIBRARY COLLECTION</small>
                            </div>

                            {bookCategory && (
                              <span className="book-catalog-card__category">
                                {bookCategory}
                              </span>
                            )}
                          </div>

                          <div className="book-catalog-card__body">
                            <div className="book-catalog-card__meta">
                              <span>{getBookYear(book) || 'Chưa rõ năm'}</span>
                              <span
                                className={
                                  available
                                    ? 'book-catalog-card__status is-available'
                                    : 'book-catalog-card__status is-unavailable'
                                }
                              >
                                <i />
                                {available ? 'Còn sách' : 'Hết sách'}
                              </span>
                            </div>

                            <h3 title={title}>{title}</h3>

                            <p className="book-catalog-card__author">
                              <span aria-hidden="true">✍</span>
                              {author}
                            </p>

                            <div className="book-catalog-card__footer">
                              <span>Thông tin sách</span>
                              {id ? (
                                <Link
                                  to={`/books/${encodeURIComponent(id)}`}
                                  aria-label={`Xem thông tin sách ${title}`}
                                >
                                  ↗
                                </Link>
                              ) : (
                                <span aria-hidden="true">↗</span>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                {!loading &&
                  !error &&
                  filteredBooks.length > PAGE_SIZE && (
                    <nav
                      className="book-catalog__pagination"
                      aria-label="Phân trang"
                    >
                      <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setPage((value) => value - 1)}
                      >
                        ← Trước
                      </button>

                      {Array.from(
                        { length: totalPages },
                        (_, index) => index + 1
                      ).map((pageNumber) => (
                        <button
                          type="button"
                          key={pageNumber}
                          className={
                            currentPage === pageNumber ? 'is-active' : ''
                          }
                          aria-current={
                            currentPage === pageNumber ? 'page' : undefined
                          }
                          onClick={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setPage((value) => value + 1)}
                      >
                        Sau →
                      </button>
                    </nav>
                  )}
              </section>
            </div>
          </div>
        </section>

        <section className="book-catalog__cta">
          <div className="book-catalog__container">
            <div className="book-catalog__cta-inner">
              <div>
                <span>HÀNH TRÌNH TRI THỨC BẮT ĐẦU TỪ ĐÂY</span>
                <h2>
                  Một từ khóa nhỏ.
                  <br />
                  Một thế giới kiến thức lớn.
                </h2>
                <p>
                  Tiếp tục khám phá và tìm cuốn sách dành cho bạn.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Tìm sách ngay <span>↑</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default BookCatalog;