const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');

const getClientIp = (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;
};

const userController = {
    // 1. Lấy danh sách người dùng
    getUsers: asyncHandler(async (req, res) => {
        const data = await userService.getUsers(req.query);
        res.status(200).json({
            success: true,
            data,
        });
    }),

    // 2. Lấy thông tin chi tiết một người dùng
    getUserById: asyncHandler(async (req, res) => {
        const data = await userService.getUserById(req.params.id);
        res.status(200).json({
            success: true,
            data,
        });
    }),

    // 3. Tạo mới người dùng
    createUser: asyncHandler(async (req, res) => {
        const data = await userService.createUser(req.body, req.user, getClientIp(req));
        res.status(201).json({
            success: true,
            message: 'Tạo người dùng mới thành công.',
            data,
        });
    }),

    // 4. Cập nhật thông tin người dùng
    updateUser: asyncHandler(async (req, res) => {
        const data = await userService.updateUser(req.params.id, req.body, req.user, getClientIp(req));
        res.status(200).json({
            success: true,
            message: 'Cập nhật thông tin người dùng thành công.',
            data,
        });
    }),

    // 5. Thay đổi vai trò người dùng (Role)
    changeRole: asyncHandler(async (req, res) => {
        const data = await userService.changeRole(req.params.id, req.body.role, req.user, getClientIp(req));
        res.status(200).json({
            success: true,
            message: 'Thay đổi vai trò người dùng thành công.',
            data,
        });
    }),

    // 6. Thay đổi trạng thái tài khoản (Status)
    changeStatus: asyncHandler(async (req, res) => {
        const data = await userService.changeStatus(req.params.id, req.body.status, req.user, getClientIp(req));
        res.status(200).json({
            success: true,
            message: 'Thay đổi trạng thái tài khoản thành công.',
            data,
        });
    }),

    // 7. Xóa người dùng
    deleteUser: asyncHandler(async (req, res) => {
        const result = await userService.deleteUser(req.params.id, req.user, getClientIp(req));
        res.status(200).json(result);
    }),
};

module.exports = userController;
