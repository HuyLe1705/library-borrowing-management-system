import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import Header from '../../../Component/header/header';
import Footer from '../../../Component/footer/footer';
import { getBookById } from '../../../Services/bookService';
import { createBorrowRequest } from '../../../Services/borrowService';
import { useAuth } from '../../../Context/AuthContext';
import './BookDetail.css';

function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function getBookAvailability(book) {
    if (typeof book?.availableCopies === 'number') {
        return book.availableCopies;
    }

    if (Array.isArray(book?.copies)) {
        return book.copies.filter(
            (copy) => copy.status === 'AVAILABLE'
        ).length;
    }

    return null;
}

function getAvailableCopies(book) {
    if (!Array.isArray(book?.copies)) {
        return [];
    }

    return book.copies.filter(
        (copy) => copy.status === 'AVAILABLE'
    );
}

function getErrorMessage(error) {
    return error?.message || 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

export default function BookDetail() {
    const { id } = useParams();
    const { isAuthenticated } = useAuth();

    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    const [copyId, setCopyId] = useState('');
    const [note, setNote] = useState('');
    const [expectedPickupDate, setExpectedPickupDate] = useState(
        getTodayDate()
    );

    const [submitting, setSubmitting] = useState(false);
    const [requestError, setRequestError] = useState('');
    const [requestSuccess, setRequestSuccess] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadBook() {
            setLoading(true);
            setLoadError('');
            setBook(null);

            try {
                const result = await getBookById(id);

                if (cancelled) return;

                setBook(result);
            } catch (error) {
                if (cancelled) return;

                setLoadError(
                    getErrorMessage(error) ||
                    'Không thể tải thông tin sách.'
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        if (id) {
            loadBook();
        } else {
            setLoadError('Không tìm thấy mã sách.');
            setLoading(false);
        }

        return () => {
            cancelled = true;
        };
    }, [id]);

    const availableCopies = useMemo(
        () => (book ? getAvailableCopies(book) : []),
        [book]
    );

    const availableCount = book ? getBookAvailability(book) : null;

    const canRequestBorrow =
        availableCount === null || availableCount > 0;

    async function handleSubmit(event) {
        event.preventDefault();

        setRequestError('');
        setRequestSuccess(null);

        if (!isAuthenticated) {
            setRequestError(
                'Vui lòng đăng nhập trước khi gửi yêu cầu mượn sách.'
            );
            return;
        }

        if (!book) {
            setRequestError('Không tìm thấy thông tin sách.');
            return;
        }

        if (!canRequestBorrow) {
            setRequestError(
                'Hiện không có bản sao khả dụng để đăng ký mượn.'
            );
            return;
        }

        if (!expectedPickupDate) {
            setRequestError('Vui lòng chọn ngày dự kiến nhận sách.');
            return;
        }

        if (expectedPickupDate < getTodayDate()) {
            setRequestError(
                'Ngày dự kiến nhận sách không được ở trong quá khứ.'
            );
            return;
        }

        setSubmitting(true);

        try {
            const result = await createBorrowRequest({
                bookId: book.id ?? book.bookId ?? id,
                copyId: copyId || null,
                note,
                expectedPickupDate,
            });

            setRequestSuccess(result);
            setNote('');
        } catch (error) {
            setRequestError(getErrorMessage(error));
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <>
                <Header />
                <main className="book-detail-page">
                    <div className="book-detail-state">
                        <div className="book-detail-spinner" />
                        <p>Đang tải thông tin sách...</p>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    if (loadError || !book) {
        return (
            <>
                <Header />
                <main className="book-detail-page">
                    <div className="book-detail-state book-detail-error">
                        <h2>Không thể hiển thị sách</h2>
                        <p>{loadError || 'Không tìm thấy sách.'}</p>
                        <Link to="/books" className="book-detail-back">
                            Quay lại danh mục sách
                        </Link>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    const title = book.title || 'Chưa có tên sách';
    const coverUrl = book.coverUrl || book.imageUrl || '';
    const author = book.author || 'Chưa cập nhật';
    const category =
        typeof book.category === 'object'
            ? book.category?.name
            : book.category;

    return (
        <>
            <Header />

            <main className="book-detail-page">
                <div className="book-detail-container">
                    <nav className="book-detail-breadcrumb">
                        <Link to="/">Trang chủ</Link>
                        <span>/</span>
                        <Link to="/books">Danh mục sách</Link>
                        <span>/</span>
                        <span>{title}</span>
                    </nav>

                    <section className="book-detail-main">
                        <div className="book-detail-cover">
                            {coverUrl ? (
                                <img
                                    src={coverUrl}
                                    alt={`Bìa sách ${title}`}
                                    onError={(event) => {
                                        event.currentTarget.style.display =
                                            'none';
                                    }}
                                />
                            ) : (
                                <div className="book-detail-no-cover">
                                    <span>📚</span>
                                    <p>Chưa có ảnh bìa</p>
                                </div>
                            )}
                        </div>

                        <div className="book-detail-information">
                            <span className="book-detail-label">
                                CHI TIẾT SÁCH
                            </span>

                            <h1>{title}</h1>

                            <p className="book-detail-author">
                                Tác giả: <strong>{author}</strong>
                            </p>

                            <div className="book-detail-metadata">
                                {category && (
                                    <div>
                                        <span>Thể loại</span>
                                        <strong>{category}</strong>
                                    </div>
                                )}

                                {book.publisher && (
                                    <div>
                                        <span>Nhà xuất bản</span>
                                        <strong>{book.publisher}</strong>
                                    </div>
                                )}

                                {book.year && (
                                    <div>
                                        <span>Năm xuất bản</span>
                                        <strong>{book.year}</strong>
                                    </div>
                                )}

                                {book.isbn && (
                                    <div>
                                        <span>ISBN</span>
                                        <strong>{book.isbn}</strong>
                                    </div>
                                )}

                                {book.language && (
                                    <div>
                                        <span>Ngôn ngữ</span>
                                        <strong>{book.language}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="book-detail-availability">
                                <span className="book-detail-availability-label">
                                    Tình trạng:
                                </span>

                                {availableCount === null ? (
                                    <strong>
                                        Vui lòng kiểm tra tại thư viện
                                    </strong>
                                ) : availableCount > 0 ? (
                                    <strong className="is-available">
                                        Còn {availableCount} bản có thể mượn
                                    </strong>
                                ) : (
                                    <strong className="is-unavailable">
                                        Hiện không có bản khả dụng
                                    </strong>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="book-detail-lower">
                        <div className="book-detail-description">
                            <h2>Giới thiệu sách</h2>
                            <p>
                                {book.description ||
                                    'Hiện chưa có mô tả cho cuốn sách này.'}
                            </p>

                            {Array.isArray(book.copies) &&
                                book.copies.length > 0 && (
                                    <div className="book-detail-copies">
                                        <h2>Thông tin bản sao</h2>

                                        <div className="book-detail-table-wrapper">
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Mã vạch</th>
                                                        <th>Vị trí</th>
                                                        <th>Trạng thái</th>
                                                    </tr>
                                                </thead>

                                                <tbody>
                                                    {book.copies.map(
                                                        (copy, index) => (
                                                            <tr
                                                                key={
                                                                    copy.id ??
                                                                    copy.copyId ??
                                                                    copy.barcode ??
                                                                    index
                                                                }
                                                            >
                                                                <td>
                                                                    {copy.barcode ||
                                                                        '—'}
                                                                </td>
                                                                <td>
                                                                    {copy.shelfLocation ||
                                                                        'Chưa cập nhật'}
                                                                </td>
                                                                <td>
                                                                    {copy.status === 'RESERVED' ? 'Đã giữ chỗ' : copy.status ===
                                                                    'AVAILABLE'
                                                                        ? 'Có thể mượn'
                                                                        : copy.status ===
                                                                            'BORROWED'
                                                                          ? 'Đang được mượn'
                                                                          : copy.status ===
                                                                              'MAINTENANCE'
                                                                            ? 'Đang bảo trì'
                                                                            : copy.status ===
                                                                                'LOST'
                                                                              ? 'Đã mất'
                                                                              : copy.status ||
                                                                                'Chưa cập nhật'}
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                        </div>

                        <aside className="book-detail-request">
                            <div className="book-detail-request-heading">
                                <span>📖</span>
                                <div>
                                    <h2>Đăng ký mượn sách</h2>
                                    <p>
                                        Gửi yêu cầu và chờ thủ thư xử lý.
                                    </p>
                                </div>
                            </div>

                            {!isAuthenticated && (
                                <div className="book-detail-login-notice">
                                    Bạn cần đăng nhập để đăng ký mượn sách.
                                    <Link to="/login">Đăng nhập ngay</Link>
                                </div>
                            )}

                            {requestSuccess && (
                                <div className="book-detail-message success">
                                    <strong>
                                        Gửi yêu cầu mượn thành công!
                                    </strong>

                                    <p>
                                        {requestSuccess.message ||
                                            'Vui lòng chờ thủ thư xử lý yêu cầu.'}
                                    </p>

                                    {requestSuccess.id && (
                                        <p>
                                            Mã yêu cầu:{' '}
                                            <strong>
                                                #{requestSuccess.id}
                                            </strong>
                                        </p>
                                    )}

                                    {requestSuccess.status && (
                                        <p>
                                            Trạng thái:{' '}
                                            <strong>
                                                {requestSuccess.status}
                                            </strong>
                                        </p>
                                    )}
                                </div>
                            )}

                            {requestError && (
                                <div
                                    className="book-detail-message error"
                                    role="alert"
                                >
                                    {requestError}
                                </div>
                            )}

                            <form onSubmit={handleSubmit}>
                                {availableCopies.length > 0 && (
                                    <div className="book-detail-form-group">
                                        <label htmlFor="copyId">
                                            Chọn bản sao
                                        </label>

                                        <select
                                            id="copyId"
                                            value={copyId}
                                            onChange={(event) =>
                                                setCopyId(event.target.value)
                                            }
                                        >
                                            <option value="">
                                                Để thư viện tự chọn
                                            </option>

                                            {availableCopies.map(
                                                (copy, index) => (
                                                    <option
                                                        key={
                                                            copy.id ??
                                                            copy.copyId ??
                                                            copy.barcode ??
                                                            index
                                                        }
                                                        value={
                                                            copy.id ??
                                                            copy.copyId
                                                        }
                                                    >
                                                        {copy.barcode ||
                                                            `Bản sao ${index + 1}`}
                                                        {copy.shelfLocation
                                                            ? ` — ${copy.shelfLocation}`
                                                            : ''}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                    </div>
                                )}

                                <div className="book-detail-form-group">
                                    <label htmlFor="expectedPickupDate">
                                        Ngày dự kiến nhận sách{' '}
                                        <span>*</span>
                                    </label>

                                    <input
                                        id="expectedPickupDate"
                                        type="date"
                                        min={getTodayDate()}
                                        value={expectedPickupDate}
                                        onChange={(event) =>
                                            setExpectedPickupDate(
                                                event.target.value
                                            )
                                        }
                                        required
                                    />
                                </div>

                                <div className="book-detail-form-group">
                                    <label htmlFor="note">
                                        Ghi chú{' '}
                                        <span className="optional">
                                            (không bắt buộc)
                                        </span>
                                    </label>

                                    <textarea
                                        id="note"
                                        rows={4}
                                        maxLength={500}
                                        placeholder="Ví dụ: Tôi cần sách để làm bài tập lớn..."
                                        value={note}
                                        onChange={(event) =>
                                            setNote(event.target.value)
                                        }
                                    />

                                    <small>{note.length}/500 ký tự</small>
                                </div>

                                <button
                                    type="submit"
                                    className="book-detail-submit"
                                    disabled={
                                        submitting ||
                                        !canRequestBorrow ||
                                        !isAuthenticated
                                    }
                                >
                                    {submitting
                                        ? 'Đang gửi yêu cầu...'
                                        : 'Gửi yêu cầu mượn sách'}
                                </button>

                                <p className="book-detail-request-footnote">
                                    Yêu cầu của bạn sẽ ở trạng thái chờ xử lý.
                                    Gửi yêu cầu không đồng nghĩa với việc đã
                                    được duyệt mượn sách.
                                </p>
                            </form>
                        </aside>
                    </section>
                </div>
            </main>

            <Footer />
        </>
    );
}
