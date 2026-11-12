const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');

const authController = {
    register: asyncHandler(async (req, res) => {
        const data = await authService.register(req.body);

        res.status(201).json({
            success: true,
            message: 'Đăng ký tài khoản thành công.',
            data,
        });
    }),

    login: asyncHandler(async (req, res) => {
        const data = await authService.login(req.body);

        res.status(200).json({
            success: true,
            message: 'Đăng nhập thành công.',
            data,
        });
    }),

    getMe: asyncHandler(async (req, res) => {
        const data = await authService.getProfile(req.user.id);

        res.status(200).json({
            success: true,
            message: 'Lấy thông tin tài khoản thành công.',
            data,
        });
    }),
};

module.exports = authController;
