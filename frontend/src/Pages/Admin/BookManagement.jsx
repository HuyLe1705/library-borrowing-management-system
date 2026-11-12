
import React, { useCallback, useEffect, useState } from 'react';
import bookService from '../../Services/bookService';
import './AdminPages.css';

const emptyBook = {
    title: '',
    author: '',
    isbn: '',
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
    const [keyword, setKeyword] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyBook);

    const loadBooks = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const result = await bookService.getBooks();
            const list = Array.isArray(result)
                ? result
                : result?.items || result?.content || result?.data || []; 
            setBooks(list);
        } catch (err) {
            setError(err.message || 'Không thể tải danh sách sách.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBooks();
    }, [loadBooks]);

    const filteredBooks = books.filter((book) => {
        const normalizedText = [
            book.title ?? book.Title,
            book.author ?? book.Author,
            book.isbn ?? book.ISBN,
            book.category ?? book.Category,
        ].join(' ').toLowerCase();

        return normalizedText.includes(keyword.trim().toLowerCase());
    });

    const updateField = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const openCreateForm = () => {
        setEditingId(null);
        setForm(emptyBook);
        setShowForm(true);
        setError('');
    };

    const openEditForm = (book) => {
        setEditingId(book.id ?? book.RecordID ?? book.recordId);
        setForm({
            ...emptyBook,
            ...book,
            cover_url: book.cover_url ?? book.coverUrl ?? book.CoverURL ?? '',
            publicationYear: book.publicationYear ?? '',
            totalCopies: book.totalCopies ?? 1,
            availableCopies: book.availableCopies ?? 1,
        });
        setShowForm(true);
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!form.title.trim() || !form.author.trim()) {
            setError('Vui lòng nhập tên sách và tác giả.');
            return;
        }

        const payload = {
            ...form,
            title: form.title.trim(),
            author: form.author.trim(),
            publicationYear: form.publicationYear
                ? Number(form.publicationYear)
                : null,
            totalCopies: Number(form.totalCopies),
            availableCopies: Number(form.availableCopies),
        };

        if (
            payload.totalCopies < 0 ||
            payload.availableCopies < 0 ||
            payload.availableCopies > payload.totalCopies
        ) {
            setError('Số lượng sách không hợp lệ.');
            return;
        }

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
            await loadBooks();
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
            await loadBooks();
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

            <div className="admin-toolbar">
                <input
                    className="admin-input"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="Tìm theo tên, tác giả, ISBN..."
                    aria-label="Tìm kiếm sách"
                />
                <button className="admin-button" onClick={openCreateForm}>
                    + Thêm sách
                </button>
                <button className="admin-secondaryButton" onClick={loadBooks}>
                    Làm mới
                </button>
            </div>

            {showForm && (
                <section className="admin-panel">
                    <h2>{editingId !== null ? 'Cập nhật sách' : 'Thêm sách mới'}</h2>

                    <form onSubmit={handleSubmit}>
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
                            <input
                                className="admin-input"
                                name="category"
                                value={form.category || ''}
                                onChange={updateField}
                                placeholder="Thể loại"
                            />
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
                                min="0"
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
                                name="cover_url"
                                type="url"
                                value={form.cover_url || ''}
                                onChange={updateField}
                                placeholder="URL ảnh bìa (cover_url)"
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
                                onClick={() => setShowForm(false)}
                            >
                                Hủy
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="admin-panel">
                <h2>Danh sách sách ({filteredBooks.length})</h2>

                {loading ? (
                    <p>Đang tải danh sách...</p>
                ) : filteredBooks.length === 0 ? (
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
                                {filteredBooks.map((book, index) => {
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
        </div>
    );
}

export default BookManagement;
