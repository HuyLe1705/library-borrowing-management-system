import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';
import { getBooks } from '../../../Services/bookService';
import categoryService from '../../../Services/categoryService';
import './BookCatalog.css';

const PAGE_SIZE = 10;

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
  book?.year ??
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

function BookCatalog() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [books, setBooks] = useState([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [apiCategories, setApiCategories] = useState([]);

  const urlQuery = searchParams.get('q') || '';
  const urlCategory = searchParams.get('category') || '';

  const [keyword, setKeyword] = useState(urlQuery);
  const [category, setCategory] = useState(urlCategory);
  const [year, setYear] = useState('');
  const [availability, setAvailability] = useState('');
  const [sortBy, setSortBy] = useState('title-asc');
  const [page, setPage] = useState(1);

  // Đồng bộ ô tìm kiếm & thể loại khi query URL thay đổi
  useEffect(() => {
    setKeyword(urlQuery);
    setCategory(urlCategory);
    setPage(1);
  }, [urlQuery, urlCategory]);

  // Tải danh sách thể loại từ API
  useEffect(() => {
    let isMounted = true;
    categoryService
      .getCategories()
      .then((res) => {
        if (!isMounted) return;
        const data = Array.isArray(res)
          ? res
          : Array.isArray(res?.data)
            ? res.data
            : [];
        const names = data
          .map((item) =>
            typeof item === 'object'
              ? item.name || item.categoryName
              : item
          )
          .filter(Boolean);
        setApiCategories(names);
      })
      .catch((err) => {
        console.warn('Không thể tải danh sách thể loại từ API:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const activeKeyword = (searchParams.get('q') || '').trim();
      const activeCategory = (searchParams.get('category') || category || '').trim();

      const params = {
        page,
        size: PAGE_SIZE,
      };

      if (activeKeyword) {
        params.keyword = activeKeyword;
      }
      if (activeCategory) {
        params.category = activeCategory;
      }
      if (year) {
        params.year = year;
      }
      if (availability) {
        params.availability = availability;
      }
      if (sortBy) {
        params.sort = sortBy;
      }

      const response = await getBooks(params);

      let items = [];
      let total = 0;
      let pages = 1;

      if (Array.isArray(response)) {
        items = response;
        total = response.length;
        pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      } else if (response && Array.isArray(response.items)) {
        items = response.items;
        total = Number(response.pagination?.total ?? items.length);
        pages = Math.max(
          1,
          Number(response.pagination?.totalPages ?? Math.ceil(total / PAGE_SIZE))
        );
      } else if (response && Array.isArray(response.data)) {
        items = response.data;
        total = items.length;
        pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
      }

      setBooks(items);
      setTotalBooks(total);
      setTotalPages(pages);
    } catch (err) {
      console.error('Không thể tải danh sách sách:', err);
      setError('Không thể tải danh sách sách. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [page, searchParams, category, year, availability, sortBy]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const categories = useMemo(() => {
    const bookCategories = books.map(getBookCategory).filter(Boolean);
    return [...new Set([...apiCategories, ...bookCategories])].sort((a, b) =>
      a.localeCompare(b, 'vi')
    );
  }, [apiCategories, books]);

  const years = useMemo(() => {
    const yearsFromBooks = books.map(getBookYear).filter(Boolean).map(String);
    const standardYears = [
      '2026', '2025', '2024', '2023', '2022', '2021', '2020',
      '2019', '2018', '2017', '2016', '2015', '2014',
      '2013', '2012', '2011', '2010', '2009', '2008', '2006', '1994'
    ];
    return [...new Set([...standardYears, ...yearsFromBooks])].sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [books]);

  const handleSearch = (event) => {
    if (event) event.preventDefault();

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

  const handleClearKeyword = () => {
    setKeyword('');
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    setSearchParams(params);
    setPage(1);
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    const params = new URLSearchParams(searchParams);
    if (val) {
      params.set('category', val);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    window.scrollTo({ top: 350, behavior: 'smooth' });
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
                    onClick={handleClearKeyword}
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
                <strong>{loading ? '—' : totalBooks}</strong>
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
                      handleCategoryChange(event.target.value)
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
                          <strong>{totalBooks}</strong> cuốn sách
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
                ) : books.length === 0 ? (
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
                    {books.map((book, index) => {
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
                                  to={`/book/${encodeURIComponent(id)}`}
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
                  totalPages > 1 && (
                    <nav
                      className="book-catalog__pagination"
                      aria-label="Phân trang"
                    >
                      <button
                        type="button"
                        disabled={page === 1}
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
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
                            page === pageNumber ? 'is-active' : ''
                          }
                          aria-current={
                            page === pageNumber ? 'page' : undefined
                          }
                          onClick={() => handlePageChange(pageNumber)}
                        >
                          {pageNumber}
                        </button>
                      ))}

                      <button
                        type="button"
                        disabled={page === totalPages}
                        onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
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