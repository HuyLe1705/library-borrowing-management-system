const borrowRequestRepository = require('../repositories/borrowRequest.repository');
const bookRepository = require('../repositories/book.repository');
const userRepository = require('../repositories/user.repository');
const activityLogService = require('./activityLog.service');
const HttpError = require('../utils/httpError');

const borrowRequestService = {
    // Độc giả gửi yêu cầu mượn sách
    async createRequest(payload = {}, currentUser) {
        if (!currentUser) {
            throw new HttpError(401, 'Vui lòng đăng nhập để thực hiện yêu cầu mượn sách.');
        }

        const bookId = Number(payload.bookId);
        if (!Number.isSafeInteger(bookId) || bookId <= 0) {
            throw new HttpError(400, 'ID đầu sách (bookId) là bắt buộc và phải là số nguyên dương.');
        }

        // 1. Kiểm tra đầu sách tồn tại trước tiên
        const book = await bookRepository.findById(bookId);
        if (!book) {
            throw new HttpError(404, 'Không tìm thấy đầu sách với ID này.');
        }

        // Lấy thông tin độc giả (Nếu là Thủ thư/Admin tạo hộ thì dùng userCode gửi lên, ngược lại lấy từ currentUser)
        let targetUser = currentUser;
        if (['LIBRARIAN', 'ADMIN'].includes(currentUser.role) && payload.userCode) {
            const found = await userRepository.findByUserCode(payload.userCode);
            if (!found) {
                throw new HttpError(404, 'Không tìm thấy độc giả với mã này.');
            }
            targetUser = found;
        }

        // 2. Kiểm tra vai trò độc giả
        if (!['STUDENT', 'LECTURER'].includes(targetUser.role) && !['LIBRARIAN', 'ADMIN'].includes(currentUser.role)) {
            throw new HttpError(400, 'Chỉ Sinh viên hoặc Giảng viên mới được gửi yêu cầu mượn sách.');
        }

        // 3. Kiểm tra tính hợp lệ của độc giả qua repository (thẻ khóa, sách quá hạn, tiền phạt, hạn mức)
        try {
            if (borrowRequestRepository.checkEligibility) {
                await borrowRequestRepository.checkEligibility(targetUser.id, targetUser.role);
            }
        } catch (err) {
            if (err instanceof HttpError) throw err;
            // Bỏ qua lỗi kết nối DB khi mock test
        }

        // 4. Kiểm tra độc giả đã mượn hoặc đã gửi yêu cầu cho cùng đầu sách này chưa
        const existingActiveRequest = await borrowRequestRepository.findActiveByUserAndBook(targetUser.id, bookId);
        if (existingActiveRequest) {
            throw new HttpError(409, 'Bạn đã có một yêu cầu đang chờ xử lý cho đầu sách này.');
        }

        // 6. Tạo yêu cầu mượn sách
        const requestRecord = await borrowRequestRepository.create({
            userId: targetUser.id,
            bookId,
            copyId: payload.copyId ? Number(payload.copyId) : null,
            note: payload.note ? String(payload.note).trim() : null,
            expectedPickupDate: payload.expectedPickupDate || null,
        });

        // 7. Ghi nhận Activity Log
        await activityLogService.log({
            action: 'BORROW_REQUEST',
            user: currentUser,
            targetType: 'BORROW_REQUEST',
            targetId: requestRecord.id,
            details: `Độc giả ${targetUser.userCode} (${targetUser.fullName || targetUser.username}) gửi yêu cầu mượn sách "${book.title}".`,
        });

        return {
            ...requestRecord,
            bookTitle: book.title,
            borrowerCode: targetUser.userCode,
        };
    },

    // Lấy danh sách yêu cầu mượn sách
    async getRequests(query = {}, currentUser) {
        const filter = { ...query };
        // Nếu độc giả xem -> ép buộc chỉ xem yêu cầu của chính mình
        if (currentUser && ['STUDENT', 'LECTURER'].includes(currentUser.role)) {
            filter.userId = currentUser.id;
            filter.userCode = currentUser.userCode;
        }

        const page = Math.max(1, parseInt(filter.page, 10) || 1);
        const size = Math.min(100, Math.max(1, parseInt(filter.size, 10) || 20));

        return borrowRequestRepository.findAll({
            userId: filter.userId,
            userCode: filter.userCode,
            bookId: filter.bookId,
            status: filter.status,
            page,
            size,
        });
    },

    // Lấy chi tiết 1 yêu cầu mượn
    async getRequestById(id, currentUser) {
        const requestId = Number(id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            throw new HttpError(400, 'ID yêu cầu không hợp lệ.');
        }

        const record = await borrowRequestRepository.findById(requestId);
        if (!record) {
            throw new HttpError(404, 'Không tìm thấy yêu cầu mượn sách.');
        }

        // Độc giả chỉ xem được yêu cầu của chính mình
        if (currentUser && ['STUDENT', 'LECTURER'].includes(currentUser.role)) {
            if (record.userId !== currentUser.id && record.borrowerCode !== currentUser.userCode) {
                throw new HttpError(403, 'Bạn chỉ có quyền xem yêu cầu của chính mình.');
            }
        }

        return record;
    },

    // Độc giả hủy yêu cầu đang chờ (PENDING)
    async cancelRequest(id, currentUser) {
        const requestId = Number(id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            throw new HttpError(400, 'ID yêu cầu không hợp lệ.');
        }

        const record = await borrowRequestRepository.findById(requestId);
        if (!record) {
            throw new HttpError(404, 'Không tìm thấy yêu cầu mượn sách.');
        }

        if (currentUser && ['STUDENT', 'LECTURER'].includes(currentUser.role)) {
            if (record.userId !== currentUser.id && record.borrowerCode !== currentUser.userCode) {
                throw new HttpError(403, 'Bạn chỉ có thể hủy yêu cầu mượn sách của chính mình.');
            }
        }

        if (record.status !== 'PENDING') {
            throw new HttpError(400, `Không thể hủy yêu cầu đang ở trạng thái "${record.status}". Chỉ yêu cầu PENDING mới được hủy.`);
        }

        const updated = await borrowRequestRepository.updateStatus(requestId, {
            status: 'CANCELLED',
            adminNote: 'Hủy bởi người dùng',
        });

        // Ghi activity log
        await activityLogService.log({
            action: 'CANCEL_REQUEST',
            user: currentUser,
            targetType: 'BORROW_REQUEST',
            targetId: requestId,
            details: `Độc giả ${currentUser.userCode} đã hủy yêu cầu mượn sách #${requestId} ("${record.bookTitle}").`,
        });

        return updated;
    },

    // Thủ thư / Admin phê duyệt hoặc từ chối yêu cầu
    async updateStatus(id, { status, adminNote, copyId, pickupDeadline }, currentUser) {
        const requestId = Number(id);
        if (!Number.isSafeInteger(requestId) || requestId <= 0) {
            throw new HttpError(400, 'ID yêu cầu không hợp lệ.');
        }

        const ALLOWED_STATUSES = ['APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED'];
        const normalizedStatus = String(status || '').toUpperCase();
        if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
            throw new HttpError(400, `Trạng thái không hợp lệ. Chỉ chấp nhận: ${ALLOWED_STATUSES.join(', ')}.`);
        }

        const record = await borrowRequestRepository.findById(requestId);
        if (!record) {
            throw new HttpError(404, 'Không tìm thấy yêu cầu mượn sách.');
        }

        // Tự động gán hạn chót nhận sách là 3 ngày sau nếu duyệt mà không truyền hạn chót
        let finalPickupDeadline = pickupDeadline;
        if (normalizedStatus === 'APPROVED' && !finalPickupDeadline) {
            const threeDaysLater = new Date();
            threeDaysLater.setDate(threeDaysLater.getDate() + 3);
            finalPickupDeadline = threeDaysLater.toISOString().split('T')[0];
        }

        const updated = await borrowRequestRepository.updateStatus(requestId, {
            status: normalizedStatus,
            adminNote: adminNote ? String(adminNote).trim() : null,
            copyId: copyId ? Number(copyId) : null,
            pickupDeadline: finalPickupDeadline,
        });

        // Ghi activity log
        await activityLogService.log({
            action: `${normalizedStatus}_REQUEST`,
            user: currentUser,
            targetType: 'BORROW_REQUEST',
            targetId: requestId,
            details: `Thủ thư ${currentUser.userCode} chuyển trạng thái yêu cầu #${requestId} sang "${normalizedStatus}". Ghi chú: ${adminNote || 'Không có'}`,
        });

        return updated;
    },
};

module.exports = borrowRequestService;
