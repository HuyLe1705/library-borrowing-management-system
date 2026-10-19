const borrowService = require('../services/borrow.service');
const asyncHandler = require('../utils/asyncHandler');

const borrowController = {
    getBorrows: asyncHandler(async (req, res) => {
        const data = await borrowService.getBorrows(req.query);
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách giao dịch mượn trả thành công.',
            data,
        });
    }),

    borrowBook: asyncHandler(async (req, res) => {
        const data = await borrowService.borrowBook(req.body);
        res.status(201).json({
            success: true,
            message: 'Ghi nhận mượn sách thành công.',
            data,
        });
    }),

    returnBook: asyncHandler(async (req, res) => {
        const data = await borrowService.returnBook(req.body);
        res.status(200).json({
            success: true,
            message: data.fine
                ? `Trả sách thành công. Phát sinh phạt quá hạn ${data.overdueDays} ngày.`
                : 'Trả sách đúng hạn thành công.',
            data,
        });
    }),

    renewBorrow: asyncHandler(async (req, res) => {
        const data = await borrowService.renewBorrow(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Gia hạn sách thành công (+7 ngày).',
            data,
        });
    }),

    payFine: asyncHandler(async (req, res) => {
        const data = await borrowService.payFine(req.params.id);
        res.status(200).json({
            success: true,
            message: 'Ghi nhận thanh toán tiền phạt và mở khóa thẻ thành công.',
            data,
        });
    }),
};

module.exports = borrowController;