
import React from 'react';
import { Link } from 'react-router-dom';
import './BookCard.css';

const BookCard = ({
    book,
    onBorrow,
    showBorrowButton = false,
}) => {
    if (!book) return null;

    const {
        id,
        title,
        author,
        category,
        cover,
        availableCopies = 0,
    } = book;

    const isAvailable = availableCopies > 0;

    return (
        <article className="book-card">
            <Link
                to={`/book/${id}`}
                className="book-card-cover-link"
                aria-label={`Xem chi tiết sách ${title}`}
            >
                <div className="book-card-cover">
                    <img
                        src={
                            cover ||
                            'https://placehold.co/180x250/eaf2ff/1769e0?text=BK+Library'
                        }
                        alt={`Bìa sách ${title}`}
                        loading="lazy"
                        onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src =
                                'https://placehold.co/180x250/eaf2ff/1769e0?text=BK+Library';
                        }}
                    />
                </div>
            </Link>

            <div className="book-card-content">
                <Link to={`/book/${id}`} className="book-card-title">
                    {title}
                </Link>

                <p className="book-card-author">{author}</p>

                {category && (
                    <span className="book-card-category">
                        {category}
                    </span>
                )}

                <div className="book-card-bottom">
                    <span
                        className={`book-card-availability ${
                            isAvailable ? 'available' : 'unavailable'
                        }`}
                    >
                        <span className="availability-icon">
                            {isAvailable ? '▤' : '–'}
                        </span>
                        {isAvailable
                            ? `Còn ${availableCopies} bản`
                            : 'Hết sách'}
                    </span>

                    {showBorrowButton && isAvailable && (
                        <button
                            type="button"
                            className="book-card-borrow"
                            onClick={() => onBorrow?.(book)}
                        >
                            Mượn
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

export default BookCard;
