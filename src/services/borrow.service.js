const borrowRepository = require('../repositories/borrow.repository');
const HttpError = require('../utils/httpError');

const borrowService = {
    async getBorrows(query) {
        return borrowRepository.findAll({
            userCode: query.userCode?.trim(),
            barcode: query.barcode?.trim(),
            status: query.status?.trim(),
        });
    },

    async borrowBook(payload = {}) {
        const userCode = payload.userCode?.trim();
        const barcode = payload.barcode?.trim();
        const librarianCode = payload.librarianCode?.trim();

        if (!userCode || !barcode) {
            throw new HttpError(400, 'Mã độc giả (userCode) và mã vạch sách (barcode) là bắt buộc.');
        }

        return borrowRepository.createBorrow({ userCode, barcode, librarianCode });
    },

    async returnBook(payload = {}) {
        const barcode = payload.barcode?.trim();
        const librarianCode = payload.librarianCode?.trim();

        if (!barcode) {
            throw new HttpError(400, 'Mã vạch sách (barcode) là bắt buộc khi trả sách.');
        }

        return borrowRepository.returnBook({ barcode, librarianCode });
    },

    async renewBorrow(id, currentUser = null) {
        const borrowId = Number(id);
        if (!Number.isSafeInteger(borrowId) || borrowId <= 0) {
            throw new HttpError(400, 'ID phiếu mượn không hợp lệ.');
        }

        return borrowRepository.renewBorrow(borrowId, currentUser);
    },

    async payFine(id) {
        const fineId = Number(id);
        if (!Number.isSafeInteger(fineId) || fineId <= 0) {
            throw new HttpError(400, 'ID phiếu phạt không hợp lệ.');
        }

        return borrowRepository.payFine(fineId);
    },
};

module.exports = borrowService;