
import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getBookById } from './bookService';
import './BookDetail.css';

const BookDetail = () => {
    const { id } = useParams();

    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');

    useEffect(() => {
        let cancelled = false;

        const loadBook = async () => {
            setLoading(true);
            setLoadError('');

            try {
                const result = await getBookById(id);

                if (!cancelled) {
                    setBook(result);
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError('Không thể tải thông tin sách.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadBook();

        return () => {
            cancelled = true;
        };
    }, [id]);

    if (loading) {
        return (
            <main className="book-detail-page">
                <div className="book-detail-state">
                    Đang tải thông tin sách...
                </div>
            </main>
        );
    }

    if (loadError || !book) {
        return (
            <main className="book-detail-page">
                <div className="book-detail-state">
                    <h1>{loadError ? 'Đã xảy ra lỗi' : 'Không tìm thấy sách'}</h1>
                    <p>
                        {loadError ||
                            'Sách không tồn tại hoặc đã bị xóa khỏi danh mục.'}
                    </p>
                    <Link to="/search" className="book-detail-back-button">
                        Quay lại tra cứu
                    </Link>
                </div>
            </main>
        );
    }

    const availableCopies = Number(book.availableCopies) || 0;
    const totalCopies = Number(book.totalCopies) || 0;
    const isAvailable = availableCopies > 0;

    return (
        <main className="book-detail-page">
            <div className="book-detail-container">
                <nav className="book-detail-breadcrumb" aria-label="Breadcrumb">
                    <Link to="/">Trang chủ</Link>
                    <span>/</span>
                    <Link to="/search">Tra cứu sách</Link>
                    <span>/</span>
                    <span>{book.title}</span>
                </nav>

                <section className="book-detail-panel">
                    <div className="book-detail-cover">
                        <img
                            src={
                                book.cover ||
                                'https://placehold.co/300x420/eaf2ff/1769e0?text=BK+Library'
                            }
                            alt={`Bìa sách ${book.title}`}
                            onError={(event) => {
                                event.currentTarget.onerror = null;
                                event.currentTarget.src =
                                    'https://placehold.co/300x420/eaf2ff/1769e0?text=BK+Library';
                            }}
                        />
                    </div>

                    <div className="book-detail-content">
                        <span className="book-detail-label">
                            THÔNG TIN TÀI LIỆU
                        </span>

                        <h1>{book.title}</h1>

                        <p className="book-detail-author">
                            Tác giả: <strong>{book.author || 'Chưa cập nhật'}</strong>
                        </p>

                        <div className="book-detail-tags">
                            {book.category && (
                                <span className="book-detail-tag">
                                    {book.category}
                                </span>
                            )}

                            <span
                                className={`book-detail-status ${
                                    isAvailable ? 'available' : 'unavailable'
                                }`}
                            >
                                {isAvailable ? 'Còn sách' : 'Hết sách'}
                            </span>
                        </div>

                        <div className="book-detail-inventory">
                            <div>
                                <span>Số bản có thể mượn</span>
                                <strong>{availableCopies}</strong>
                            </div>

                            <div>
                                <span>Tổng số bản</span>
                                <strong>{totalCopies}</strong>
                            </div>
                        </div>

                        <h2>Thông tin xuất bản</h2>

                        <dl className="book-detail-metadata">
                            <div>
                                <dt>ISBN</dt>
                                <dd>{book.isbn || 'Chưa cập nhật'}</dd>
                            </div>

                            <div>
                                <dt>Năm xuất bản</dt>
                                <dd>{book.publicationYear || 'Chưa cập nhật'}</dd>
                            </div>

                            <div>
                                <dt>Nhà xuất bản</dt>
                                <dd>{book.publisher || 'Chưa cập nhật'}</dd>
                            </div>

                            <div>
                                <dt>Ngôn ngữ</dt>
                                <dd>{book.language || 'Chưa cập nhật'}</dd>
                            </div>
                        </dl>

                        <div className="book-detail-actions">
                            <Link to="/search" className="book-detail-back-button">
                                ← Quay lại danh sách
                            </Link>

                            {isAvailable ? (
                                <Link
                                    to={`/cart?bookId=${encodeURIComponent(book.id)}`}
                                    className="book-detail-borrow-button"
                                >
                                    Đăng ký mượn
                                </Link>
                            ) : (
                                <button
                                    type="button"
                                    className="book-detail-borrow-button"
                                    disabled
                                >
                                    Hiện không có sách
                                </button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="book-detail-description">
                    <h2>Giới thiệu sách</h2>
                    <p>
                        {book.description ||
                            'Chưa có thông tin giới thiệu cho tài liệu này.'}
                    </p>
                </section>
            </div>
        </main>
    );
};

export default BookDetail;
