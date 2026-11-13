import React from 'react';
import './Pagination.css';

export default function Pagination({
    page = 1,
    totalPages = 0,
    total = 0,
    size = 10,
    onPageChange,
    loading = false,
}) {
    if (totalPages <= 0) return null;

    const start = total === 0 ? 0 : (page - 1) * size + 1;
    const end = Math.min(page * size, total);

    // Hiển thị tối đa 5 số trang xung quanh trang hiện tại.
    const maxVisiblePages = 5;
    let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(
        totalPages,
        startPage + maxVisiblePages - 1
    );

    startPage = Math.max(1, endPage - maxVisiblePages + 1);

    const pages = Array.from(
        { length: endPage - startPage + 1 },
        (_, index) => startPage + index
    );

    return (
        <div className="pagination">
            <div className="pagination__info">
                Hiển thị <strong>{start}–{end}</strong> trên tổng số{' '}
                <strong>{total}</strong> bản ghi
            </div>

            <div className="pagination__controls">
                <button
                    type="button"
                    className="pagination__button pagination__arrow"
                    disabled={page <= 1 || loading}
                    onClick={() => onPageChange(page - 1)}
                    aria-label="Trang trước"
                >
                    ‹
                </button>

                {startPage > 1 && (
                    <>
                        <button
                            type="button"
                            className="pagination__button"
                            disabled={loading}
                            onClick={() => onPageChange(1)}
                        >
                            1
                        </button>

                        {startPage > 2 && (
                            <span className="pagination__ellipsis">
                                …
                            </span>
                        )}
                    </>
                )}

                {pages.map((pageNumber) => (
                    <button
                        key={pageNumber}
                        type="button"
                        className={`pagination__button ${
                            pageNumber === page
                                ? 'pagination__button--active'
                                : ''
                        }`}
                        disabled={loading}
                        onClick={() => onPageChange(pageNumber)}
                        aria-current={
                            pageNumber === page ? 'page' : undefined
                        }
                    >
                        {pageNumber}
                    </button>
                ))}

                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && (
                            <span className="pagination__ellipsis">
                                …
                            </span>
                        )}

                        <button
                            type="button"
                            className="pagination__button"
                            disabled={loading}
                            onClick={() => onPageChange(totalPages)}
                        >
                            {totalPages}
                        </button>
                    </>
                )}

                <button
                    type="button"
                    className="pagination__button pagination__arrow"
                    disabled={page >= totalPages || loading}
                    onClick={() => onPageChange(page + 1)}
                    aria-label="Trang sau"
                >
                    ›
                </button>
            </div>
        </div>
    );
}