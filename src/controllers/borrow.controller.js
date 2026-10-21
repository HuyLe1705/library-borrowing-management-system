const borrowService = require('../services/borrow.service');
const asyncHandler = require('../utils/asyncHandler');
const HttpError = require('../utils/httpError');

const borrowController = {
    getBorrows: asyncHandler(async (req, res) => {
        const query = { ...req.query };
        // Nếu là độc giả (STUDENT hoặc LECTURER), chỉ cho phép xem lịch sử mượn trả của chính mình
        if (req.user && ['STUDENT', 'LECTURER'].includes(req.user.role)) {
            query.userCode = req.user.userCode;
        }
        const data = await borrowService.getBorrows(query);
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách giao dịch mượn trả thành công.',
            data,
        });
    }),

    borrowBook: asyncHandler(async (req, res) => {
        const payload = { ...req.body };
        // Độc giả chỉ được phép mượn cho chính tài khoản của mình
        if (req.user && ['STUDENT', 'LECTURER'].includes(req.user.role)) {
            if (payload.userCode && payload.userCode !== req.user.userCode) {
                throw new HttpError(403, 'Bạn chỉ có quyền mượn sách cho chính tài khoản của mình.');
            }
            payload.userCode = req.user.userCode;
        } else if (req.user && ['LIBRARIAN', 'ADMIN'].includes(req.user.role)) {
            payload.librarianCode = payload.librarianCode || req.user.userCode;
        }
        const data = await borrowService.borrowBook(payload);
        res.status(201).json({
            success: true,
            message: 'Ghi nhận mượn sách thành công.',
            data,
        });
    }),

    returnBook: asyncHandler(async (req, res) => {
        const payload = { ...req.body };
        if (req.user && ['LIBRARIAN', 'ADMIN'].includes(req.user.role)) {
            payload.librarianCode = payload.librarianCode || req.user.userCode;
        }
        const data = await borrowService.returnBook(payload);
        res.status(200).json({
            success: true,
            message: data.fine
                ? `Trả sách thành công. Phát sinh phạt quá hạn ${data.overdueDays} ngày.`
                : 'Trả sách đúng hạn thành công.',
            data,
        });
    }),

    renewBorrow: asyncHandler(async (req, res) => {
        const data = await borrowService.renewBorrow(req.params.id, req.user);
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