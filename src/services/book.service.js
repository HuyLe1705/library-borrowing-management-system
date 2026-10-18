const bookRepository = require('../repositories/book.repository');
const HttpError = require('../utils/httpError');

const parseId = (value) => {
    const id = Number(value);

    if (!Number.isSafeInteger(id) || id <= 0) {
        throw new HttpError(400, 'ID sách không hợp lệ.');
    }

    return id;
};

const validateBook = (book) => {
    if (!book || typeof book !== 'object' || Array.isArray(book)) {
        throw new HttpError(400, 'Dữ liệu sách không hợp lệ.');
    }

    if (typeof book.title !== 'string' || !book.title.trim()) {
        throw new HttpError(400, 'Tên sách không được để trống.');
    }

    if (
        book.year !== undefined &&
        book.year !== null &&
        book.year !== ''
    ) {
        const year = Number(book.year);

        if (!Number.isInteger(year) || year < 1 || year > 9999) {
            throw new HttpError(400, 'Năm xuất bản không hợp lệ.');
        }
    }

    if (
        book.categoryId !== undefined &&
        book.categoryId !== null &&
        book.categoryId !== ''
    ) {
        const categoryId = Number(book.categoryId);

        if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
            throw new HttpError(400, 'ID thể loại không hợp lệ.');
        }
    }
};

const bookService = {
    async getBooks(query) {
        const page = Number(query.page ?? 1);
        const size = Number(query.size ?? 10);

        if (!Number.isInteger(page) || page < 1) {
            throw new HttpError(400, 'page phải là số nguyên từ 1 trở lên.');
        }

        if (!Number.isInteger(size) || size < 1 || size > 100) {
            throw new HttpError(400, 'size phải nằm trong khoảng 1–100.');
        }

        const year =
            query.year === undefined || query.year === ''
                ? undefined
                : Number(query.year);

        if (year !== undefined && !Number.isInteger(year)) {
            throw new HttpError(400, 'year không hợp lệ.');
        }

        const keyword =
            typeof query.keyword === 'string'
                ? query.keyword.trim()
                : '';

        const category =
            typeof query.category === 'string'
                ? query.category.trim()
                : '';

        const result = await bookRepository.findAll({
            keyword,
            category: category || undefined,
            year,
            page,
            size,
            sort: query.sort,
        });

        return {
            items: result.items,
            pagination: {
                page,
                size,
                total: result.total,
                totalPages: Math.ceil(result.total / size),
            },
        };
    },

    async getBookById(value) {
        const id = parseId(value);
        const book = await bookRepository.findById(id);

        if (!book) {
            throw new HttpError(404, 'Không tìm thấy sách.');
        }

        return book;
    },

    async createBook(book) {
        validateBook(book);

        if (book.categoryId) {
            const category = await bookRepository.findCategoryById(
                Number(book.categoryId)
            );

            if (!category) {
                throw new HttpError(400, 'Thể loại không tồn tại.');
            }
        }

        return bookRepository.create({
            ...book,
            title: book.title.trim(),
        });
    },

    async updateBook(value, book) {
        const id = parseId(value);
        validateBook(book);

        if (book.categoryId) {
            const category = await bookRepository.findCategoryById(
                Number(book.categoryId)
            );

            if (!category) {
                throw new HttpError(400, 'Thể loại không tồn tại.');
            }
        }

        const updatedBook = await bookRepository.update(id, {
            ...book,
            title: book.title.trim(),
        });

        if (!updatedBook) {
            throw new HttpError(404, 'Không tìm thấy sách để cập nhật.');
        }

        return updatedBook;
    },

    async deleteBook(value) {
        const id = parseId(value);
        const deletedBook = await bookRepository.delete(id);

        if (!deletedBook) {
            throw new HttpError(404, 'Không tìm thấy sách để xóa.');
        }

        return deletedBook;
    },

    async getCategories() {
        return bookRepository.findCategories();
    },
};

module.exports = bookService;