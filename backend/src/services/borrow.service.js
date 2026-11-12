const borrowRepository = require('../repositories/borrow.repository');
const activityLogService = require('./activityLog.service');
const HttpError = require('../utils/httpError');

const borrowService = {
    async getBorrows(query = {}) {
        return borrowRepository.findAll({
            userCode: query.userCode?.trim(),
            barcode: query.barcode?.trim(),
            status: query.status?.trim(),
        });
    },

    async getOverdueBorrows(query = {}) {
        return borrowRepository.findOverdue({
            userCode: query.userCode?.trim(),
        });
    },

    async borrowBook(payload = {}, currentUser = null) {
        const userCode = payload.userCode?.trim();
        const barcode = payload.barcode?.trim();
        const librarianCode = payload.librarianCode?.trim() || currentUser?.userCode || 'TT001';

        if (!userCode || !barcode) {
            throw new HttpError(400, 'Mã độc giả (userCode) và mã vạch sách (barcode) là bắt buộc.');
        }

        const result = await borrowRepository.createBorrow({ userCode, barcode, librarianCode });

        // Tự động ghi activity log
        await activityLogService.log({
            action: 'BORROW',
            user: currentUser,
            userCode: librarianCode,
            targetType: 'BORROW_RECORD',
            targetId: result.id,
            details: `Thủ thư ${librarianCode} cho độc giả ${userCode} mượn bản sao sách ${barcode}. Hạn trả: ${result.dueDate}`,
        });

        return result;
    },

    async returnBook(payload = {}, currentUser = null) {
        const barcode = payload.barcode?.trim();
        const librarianCode = payload.librarianCode?.trim() || currentUser?.userCode || 'TT001';

        if (!barcode) {
            throw new HttpError(400, 'Mã vạch sách (barcode) là bắt buộc khi trả sách.');
        }

        const result = await borrowRepository.returnBook({ barcode, librarianCode });

        // Tự động ghi activity log
        const fineNote = result.fine
            ? `Phát sinh tiền phạt ${result.fine.amount} VNĐ do quá hạn ${result.overdueDays} ngày.`
            : 'Trả đúng hạn.';
        await activityLogService.log({
            action: 'RETURN',
            user: currentUser,
            userCode: librarianCode,
            targetType: 'BORROW_RECORD',
            targetId: result.borrowId,
            details: `Thủ thư ${librarianCode} tiếp nhận trả sách mã vạch ${barcode}. ${fineNote}`,
        });

        return result;
    },

    async renewBorrow(id, currentUser = null) {
        const borrowId = Number(id);
        if (!Number.isSafeInteger(borrowId) || borrowId <= 0) {
            throw new HttpError(400, 'ID phiếu mượn không hợp lệ.');
        }

        const result = await borrowRepository.renewBorrow(borrowId, currentUser);

        // Tự động ghi activity log
        await activityLogService.log({
            action: 'RENEW',
            user: currentUser,
            targetType: 'BORROW_RECORD',
            targetId: borrowId,
            details: `Gia hạn thành công phiếu mượn #${borrowId}. Hạn trả mới: ${result.newDueDate} (Số lần gia hạn: ${result.renewalCount})`,
        });

        return result;
    },

    async payFine(id, currentUser = null) {
        const fineId = Number(id);
        if (!Number.isSafeInteger(fineId) || fineId <= 0) {
            throw new HttpError(400, 'ID phiếu phạt không hợp lệ.');
        }

        const result = await borrowRepository.payFine(fineId);

        // Tự động ghi activity log
        await activityLogService.log({
            action: 'PAY_FINE',
            user: currentUser,
            targetType: 'FINE',
            targetId: fineId,
            details: `Ghi nhận thanh toán tiền phạt #${fineId} và mở lại trạng thái thẻ độc giả.`,
        });

        return result;
    },
};

module.exports = borrowService;