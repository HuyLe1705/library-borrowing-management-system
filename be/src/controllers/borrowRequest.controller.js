const borrowRequestService = require('../services/borrowRequest.service');
const asyncHandler = require('../utils/asyncHandler');

const borrowRequestController = {
    // Độc giả gửi yêu cầu mượn sách
    createRequest: asyncHandler(async (req, res) => {
        const data = await borrowRequestService.createRequest(req.body, req.user);
        res.status(201).json({
            success: true,
            message: 'Gửi yêu cầu mượn sách thành công. Vui lòng chờ Thủ thư xử lý.',
            data,
        });
    }),

    // Lấy danh sách yêu cầu mượn sách
    getRequests: asyncHandler(async (req, res) => {
        const data = await borrowRequestService.getRequests(req.query, req.user);
        res.status(200).json({
            success: true,
            message: 'Lấy danh sách yêu cầu mượn sách thành công.',
            data,
        });
    }),

    // Lấy chi tiết 1 yêu cầu mượn sách
    getRequestById: asyncHandler(async (req, res) => {
        const data = await borrowRequestService.getRequestById(req.params.id, req.user);
        res.status(200).json({
            success: true,
            message: 'Lấy thông tin yêu cầu mượn sách thành công.',
            data,
        });
    }),

    // Độc giả hủy yêu cầu mượn sách
    cancelRequest: asyncHandler(async (req, res) => {
        const data = await borrowRequestService.cancelRequest(req.params.id, req.user);
        res.status(200).json({
            success: true,
            message: 'Hủy yêu cầu mượn sách thành công.',
            data,
        });
    }),

    // Thủ thư / Quản trị viên cập nhật trạng thái yêu cầu mượn sách
    updateStatus: asyncHandler(async (req, res) => {
        const data = await borrowRequestService.updateStatus(req.params.id, req.body, req.user);
        res.status(200).json({
            success: true,
            message: `Cập nhật trạng thái yêu cầu mượn sách thành "${data.status}" thành công.`,
            data,
        });
    }),
};

module.exports = borrowRequestController;
