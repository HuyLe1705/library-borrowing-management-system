
import React, { useCallback, useEffect, useState } from 'react';
import bookService from '../../Services/bookService';
import categoryService from '../../Services/categoryService';
import Pagination from '../../Component/common/Pagination';
import './AdminPages.css';

const emptyBook = {
    title: '',
    author: '',
    isbn: '',
    categoryId: '',
    category: '',
    publicationYear: '',
    publisher: '',
    totalCopies: 1,
    availableCopies: 1,
    description: '',
    cover_url: '',
};

function BookManagement() {
    const [books, setBooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyBook);
    const [pagination, setPagination] = useState({
        page: 1,
        size: 10,
        total: 0,
        totalPages: 0,
    });

    const loadBooks = useCallback(async (search = keyword, page = 1) => {
        setLoading(true);
        setError('');

        try {
            const result = await bookService.getBooks({
                page,
                size: pagination.size,
                keyword: search.trim() || undefined,
            });

            const data = result?.data ?? result;

            const list = Array.isArray(data)
                ? data
                : data?.items ?? data?.content ?? data?.books ?? [];

            setBooks(list);

            setPagination(
                data?.pagination ?? {
                    page,
                    size: pagination.size,
                    total: list.length,
                    totalPages: list.length > 0 ? 1 : 0,
                }
            );
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách sách.');
            setBooks([]);
            setPagination({
                page: 1,
                size: 10,
                total: 0,
                totalPages: 0,
            });
        } finally {
            setLoading(false);
        }
    }, [keyword, pagination.size]);

    useEffect(() => {
        loadBooks();
    }, [loadBooks]);

    useEffect(() => {
        let isMounted = true;
        categoryService
            .getCategories()
            .then((res) => {
                if (!isMounted) return;
                const data = res?.data ?? res;
                const list = Array.isArray(data)
                    ? data
                    : data?.items ?? data?.content ?? [];
                setCategories(list);
            })
            .catch((err) => {
                console.error('Không thể tải danh mục sách:', err);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const handleSearch = (event) => {
        setKeyword(event.target.value);
    };

    const handleSearchSubmit = (event) => {
        event.preventDefault();
        loadBooks(keyword, 1);
    };

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => {
            const next = { ...current, [name]: value };
            if (name === 'totalCopies' && editingId === null) {
                next.availableCopies = value;
            }
            return next;
        });
    };

    const openCreateForm = () => {
        setEditingId(null);
        setForm(emptyBook);
        setShowForm(true);
        setError('');
    };

    const openEditForm = (book) => {
        const id = book.id ?? book.RecordID ?? book.recordId;
        setEditingId(id);

        const bookCategoryName = book.category ?? book.Category ?? '';
        const matchedCategory = categories.find(
            (c) =>
                c.id === book.categoryId ||
                (bookCategoryName &&
                    c.name.toLowerCase() === bookCategoryName.toLowerCase())
        );

        setForm({
            title: book.title ?? book.Title ?? '',
            author: book.author ?? book.Author ?? '',
            isbn: book.isbn ?? book.ISBN ?? '',
            categoryId: book.categoryId ?? matchedCategory?.id ?? '',
            category: bookCategoryName || (matchedCategory?.name ?? ''),
            publisher: book.publisher ?? book.Publisher ?? '',
            publicationYear:
                book.publicationYear ??
                book.year ??
                book.Year ??
                book.publish_year ??
                '',
            totalCopies: book.totalCopies ?? book.TotalCopies ?? 1,
            availableCopies: book.availableCopies ?? book.AvailableCopies ?? 1,
            description: book.description ?? book.Description ?? '',
            cover_url:
                book.cover_url ??
                book.coverUrl ??
                book.CoverURL ??
                book.CoverImage ??
                '',
        });
        setShowForm(true);
        setError('');
    };

    const handleSaveBook = async (event) => {
        event.preventDefault();
        setError('');

        if (!form.title.trim() || !form.author.trim()) {
            setError('Vui lòng nhập tên sách và tác giả.');
            return;
        }

        const totalCopiesNum = Number(form.totalCopies);
        const availableCopiesNum = Number(form.availableCopies);

        if (isNaN(totalCopiesNum) || totalCopiesNum < 0) {
            setError('Tổng số bản sách không hợp lệ.');
            return;
        }

        if (isNaN(availableCopiesNum) || availableCopiesNum < 0) {
            setError('Số bản có thể mượn không hợp lệ.');
            return;
        }

        if (availableCopiesNum > totalCopiesNum) {
            setError('Số bản có thể mượn không thể vượt quá tổng số bản.');
            return;
        }

        let parsedYear = null;
        if (
            form.publicationYear !== '' &&
            form.publicationYear !== null &&
            form.publicationYear !== undefined
        ) {
            parsedYear = Number(form.publicationYear);
            const currentYear = new Date().getFullYear();
            if (
                isNaN(parsedYear) ||
                parsedYear < 1900 ||
                parsedYear > currentYear + 1
            ) {
                setError(
                    `Năm xuất bản không hợp lệ (từ 1900 đến ${currentYear + 1}).`
                );
                return;
            }
        }

        const payload = {
            title: form.title.trim(),
            author: form.author.trim(),
            isbn: form.isbn ? form.isbn.trim() : null,
            categoryId: form.categoryId ? Number(form.categoryId) : undefined,
            category: form.category ? form.category.trim() : undefined,
            publisher: form.publisher ? form.publisher.trim() : null,
            year: parsedYear,
            publicationYear: parsedYear,
            totalCopies: totalCopiesNum,
            availableCopies: availableCopiesNum,
            coverUrl: form.cover_url ? form.cover_url.trim() : null,
            cover_url: form.cover_url ? form.cover_url.trim() : null,
            description: form.description ? form.description.trim() : null,
        };

        setSaving(true);

        try {
            if (editingId !== null) {
                await bookService.updateBook(editingId, payload);
            } else {
                await bookService.createBook(payload);
            }

            setShowForm(false);
            setEditingId(null);
            setForm(emptyBook);
            await loadBooks(keyword, pagination.page);
        } catch (err) {
            setError(err.message || 'Không thể lưu thông tin sách.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (book) => {
        const confirmed = window.confirm(
            `Bạn có chắc muốn xóa sách "${book.title}" không?`
        );

        if (!confirmed) return;

        setError('');

        try {
            await bookService.deleteBook(book.id);
            await loadBooks(keyword, pagination.page);
        } catch (err) {
            setError(err.message || 'Không thể xóa sách.');
        }
    };

    return (
        <div className="admin-page">
            <h1>Quản lý sách</h1>
            <p className="admin-subtitle">
                Thêm, cập nhật, tìm kiếm và xóa đầu sách trong thư viện.
            </p>

            {error && <p role="alert" className="admin-error">{error}</p>}

            <form
                className="admin-toolbar"
                onSubmit={handleSearchSubmit}
            >
                <input
                    className="admin-input"
                    value={keyword}
                    onChange={handleSearch}
                    placeholder="Tìm theo tên, tác giả, ISBN..."
                    aria-label="Tìm kiếm sách"
                />

                <button className="admin-button" type="button" onClick={openCreateForm}>
                    + Thêm sách
                </button>

                <button className="admin-secondaryButton" type="button" onClick={() => loadBooks(keyword, 1)}>
                    Làm mới
                </button>

                <button className="admin-button" type="submit" disabled={loading}>
                    Tìm kiếm
                </button>
            </form>

            {showForm && (
                <section className="admin-panel">
                    <h2>{editingId !== null ? 'Cập nhật sách' : 'Thêm sách mới'}</h2>

                    <form onSubmit={handleSaveBook}>
                        <div className="admin-formGrid">
                            <input
                                className="admin-input"
                                name="title"
                                value={form.title}
                                onChange={updateField}
                                placeholder="Tên sách *"
                                required
                            />
                            <input
                                className="admin-input"
                                name="author"
                                value={form.author}
                                onChange={updateField}
                                placeholder="Tác giả *"
                                required
                            />
                            <input
                                className="admin-input"
                                name="isbn"
                                value={form.isbn || ''}
                                onChange={updateField}
                                placeholder="ISBN"
                            />
                            <select
                                className="admin-input"
                                name="categoryId"
                                value={form.categoryId || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const selected = categories.find(
                                        (c) => String(c.id) === String(val)
                                    );
                                    setForm((curr) => ({
                                        ...curr,
                                        categoryId: val ? Number(val) : '',
                                        category: selected ? selected.name : '',
                                    }));
                                }}
                            >
                                <option value="">-- Chọn thể loại --</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                                {form.categoryId &&
                                    !categories.some(
                                        (c) =>
                                            String(c.id) ===
                                            String(form.categoryId)
                                    ) && (
                                        <option value={form.categoryId}>
                                            {form.category ||
                                                `Thể loại #${form.categoryId}`}
                                        </option>
                                    )}
                            </select>
                            <input
                                className="admin-input"
                                name="publisher"
                                value={form.publisher || ''}
                                onChange={updateField}
                                placeholder="Nhà xuất bản"
                            />
                            <input
                                className="admin-input"
                                name="publicationYear"
                                type="number"
                                min="1900"
                                max={new Date().getFullYear() + 1}
                                value={form.publicationYear}
                                onChange={updateField}
                                placeholder="Năm xuất bản"
                            />
                            <input
                                className="admin-input"
                                name="totalCopies"
                                type="number"
                                min="0"
                                value={form.totalCopies}
                                onChange={updateField}
                                placeholder="Tổng số bản"
                                required
                            />
                            <input
                                className="admin-input"
                                name="availableCopies"
                                type="number"
                                min="0"
                                value={form.availableCopies}
                                onChange={updateField}
                                placeholder="Số bản có thể mượn"
                                required
                            />
                            <input
                                className="admin-input"
                                name="cover_url"
                                type="url"
                                value={form.cover_url || ''}
                                onChange={updateField}
                                placeholder="URL ảnh bìa (cover_url)"
                            />
                        </div>

                        <p>
                            <textarea
                                className="admin-input admin-full-width"
                                name="description"
                                value={form.description || ''}
                                onChange={updateField}
                                placeholder="Mô tả sách"
                                rows={3}
                            />
                        </p>

                        <div className="admin-toolbar">
                            <button className="admin-button" type="submit" disabled={saving}>
                                {saving ? 'Đang lưu...' : 'Lưu sách'}
                            </button>
                            <button
                                className="admin-secondaryButton"
                                type="button"
                                onClick={() => {
                                    setShowForm(false);
                                    setEditingId(null);
                                    setForm(emptyBook);
                                    setError('');
                                }}
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="admin-panel">
                <h2>Danh sách sách ({pagination.total})</h2>

                {loading ? (
                    <p>Đang tải danh sách...</p>
                ) : books.length === 0 ? (
                    <p>Không tìm thấy sách phù hợp.</p>
                ) : (
                    <div className="admin-tableWrap">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    {['Ảnh bìa', 'Tên sách', 'Tác giả', 'ISBN', 'Thể loại', 'Năm', 'Còn lại', 'Thao tác'].map((label) => (
                                        <th key={label} className="admin-cell">{label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {books.map((book, index) => {
                                    const id = book.id ?? book.RecordID ?? book.recordId ?? index;
                                    const coverUrl = book.cover_url ?? book.coverUrl ?? book.CoverURL ?? book.CoverImage;
                                    const title = book.title ?? book.Title ?? '—';
                                    const author = book.author ?? book.Author ?? '—';
                                    const isbn = book.isbn ?? book.ISBN;
                                    const category = book.category ?? book.Category;
                                    const year = book.publicationYear ?? book.year ?? book.Year;
                                    const available = book.availableCopies ?? book.AvailableCopies ?? 0;
                                    const total = book.totalCopies ?? book.TotalCopies ?? 0;
                                    return (
                                    <tr key={id}>
                                        <td className="admin-cell">
                                            {coverUrl ? <img src={coverUrl} alt={`Bìa ${title}`} className="admin-book-cover" onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }} /> : '—'}
                                        </td>
                                        <td className="admin-cell">{title}</td>
                                        <td className="admin-cell">{author}</td>
                                        <td className="admin-cell">{isbn || '—'}</td>
                                        <td className="admin-cell">{category || '—'}</td>
                                        <td className="admin-cell">{year || '—'}</td>
                                        <td className="admin-cell">{available}/{total}</td>
                                        <td className="admin-cell">
                                            <div className="admin-actions">
                                                <button
                                                    className="admin-secondaryButton"
                                                    onClick={() => openEditForm({ ...book, id })}
                                                >
                                                    Sửa
                                                </button>
                                                <button
                                                    className="admin-dangerButton"
                                                    onClick={() => handleDelete({ ...book, id, title })}
                                                >
                                                    Xóa
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            <Pagination
                page={pagination.page}
                totalPages={pagination.totalPages}
                total={pagination.total}
                size={pagination.size}
                loading={loading}
                onPageChange={(nextPage) => loadBooks(keyword, nextPage)}
            />
        </div>
    );
}

export default BookManagement;
