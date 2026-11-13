const bookService = require('../services/book.service');
const asyncHandler = require('../utils/asyncHandler');

const bookController = {
    getBooks: asyncHandler(async (req, res) => {
        const data = await bookService.getBooks(req.query);

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách sách thành công.',
            data,
        });
    }),

    getBookById: asyncHandler(async (req, res) => {
        const data = await bookService.getBookById(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Lấy chi tiết sách thành công.',
            data,
        });
    }),

    createBook: asyncHandler(async (req, res) => {
        const data = await bookService.createBook(req.body);

        res.status(201).json({
            success: true,
            message: 'Thêm sách thành công.',
            data,
        });
    }),

    updateBook: asyncHandler(async (req, res) => {
        const data = await bookService.updateBook(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            message: 'Cập nhật sách thành công.',
            data,
        });
    }),

    deleteBook: asyncHandler(async (req, res) => {
        const data = await bookService.deleteBook(req.params.id);

        res.status(200).json({
            success: true,
            message: 'Xóa sách thành công.',
            data,
        });
    }),

    getCategories: asyncHandler(async (req, res) => {
        const data = await bookService.getCategories();

        res.status(200).json({
            success: true,
            message: 'Lấy danh sách thể loại thành công.',
            data,
        });
    }),
};

module.exports = bookController;