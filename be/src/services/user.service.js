const bcrypt = require('bcryptjs');
const userRepository = require('../repositories/user.repository');
const activityLogService = require('./activityLog.service');
const HttpError = require('../utils/httpError');

const ALLOWED_ROLES = ['STUDENT', 'LECTURER', 'LIBRARIAN', 'ADMIN'];
const ALLOWED_STATUSES = ['ACTIVE', 'LOCKED'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userService = {
    // 1. Lấy danh sách người dùng (hỗ trợ tìm kiếm, lọc theo vai trò, trạng thái, phân trang)
    async getUsers(query = {}) {
        const page = Math.max(1, parseInt(query.page, 10) || 1);
        const size = Math.min(100, Math.max(1, parseInt(query.size, 10) || 10));

        if (query.page && (isNaN(parseInt(query.page, 10)) || parseInt(query.page, 10) < 1)) {
            throw new HttpError(400, 'Tham số page phải là số nguyên dương.');
        }

        if (query.size && (isNaN(parseInt(query.size, 10)) || parseInt(query.size, 10) < 1 || parseInt(query.size, 10) > 100)) {
            throw new HttpError(400, 'Tham số size không hợp lệ (từ 1 đến 100).');
        }

        let role = undefined;
        if (query.role) {
            const normalizedRole = String(query.role).trim().toUpperCase();
            if (!ALLOWED_ROLES.includes(normalizedRole)) {
                throw new HttpError(400, `Vai trò người dùng không hợp lệ. Cho phép: ${ALLOWED_ROLES.join(', ')}.`);
            }
            role = normalizedRole;
        }

        let status = undefined;
        if (query.status) {
            const normalizedStatus = String(query.status).trim().toUpperCase();
            if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
                throw new HttpError(400, `Trạng thái tài khoản không hợp lệ. Cho phép: ${ALLOWED_STATUSES.join(', ')}.`);
            }
            status = normalizedStatus;
        }

        return userRepository.findAll({
            page,
            size,
            keyword: query.keyword,
            role,
            status,
            sort: query.sort,
            order: query.order,
        });
    },

    // 2. Lấy thông tin chi tiết một người dùng theo ID
    async getUserById(id) {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            throw new HttpError(400, 'ID người dùng không hợp lệ (phải là số nguyên dương).');
        }

        const user = await userRepository.findById(numericId);
        if (!user) {
            throw new HttpError(404, 'Không tìm thấy người dùng với ID này.');
        }

        return user;
    },

    // 3. Thêm người dùng mới
    async createUser(payload = {}, currentUser, ipAddress) {
        const { username, password, fullName, email, phone, role, status, userCode } = payload;

        if (!username || typeof username !== 'string' || !username.trim()) {
            throw new HttpError(400, 'Tên đăng nhập không được để trống.');
        }

        const trimmedUsername = username.trim();
        if (trimmedUsername.length < 3) {
            throw new HttpError(400, 'Tên đăng nhập phải có ít nhất 3 ký tự.');
        }

        if (!password || typeof password !== 'string' || !password.trim()) {
            throw new HttpError(400, 'Mật khẩu không được để trống.');
        }

        const trimmedPassword = password.trim();
        if (trimmedPassword.length < 6) {
            throw new HttpError(400, 'Mật khẩu phải có ít nhất 6 ký tự.');
        }

        if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
            throw new HttpError(400, 'Họ và tên không được để trống.');
        }

        if (!email || typeof email !== 'string' || !email.trim()) {
            throw new HttpError(400, 'Email không được để trống.');
        }

        const trimmedEmail = email.trim().toLowerCase();
        if (!EMAIL_REGEX.test(trimmedEmail)) {
            throw new HttpError(400, 'Email không đúng định dạng.');
        }

        let safeRole = 'STUDENT';
        if (role !== undefined && role !== null && String(role).trim() !== '') {
            const normalizedRole = String(role).trim().toUpperCase();
            if (!ALLOWED_ROLES.includes(normalizedRole)) {
                throw new HttpError(400, `Vai trò người dùng không hợp lệ. Cho phép: ${ALLOWED_ROLES.join(', ')}.`);
            }
            safeRole = normalizedRole;
        }

        let safeStatus = 'ACTIVE';
        if (status !== undefined && status !== null && String(status).trim() !== '') {
            const normalizedStatus = String(status).trim().toUpperCase();
            if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
                throw new HttpError(400, `Trạng thái không hợp lệ. Cho phép: ${ALLOWED_STATUSES.join(', ')}.`);
            }
            safeStatus = normalizedStatus;
        }

        // Kiểm tra trùng username
        const existingUsername = await userRepository.findByUsername(trimmedUsername);
        if (existingUsername) {
            throw new HttpError(409, 'Tên đăng nhập đã tồn tại trong hệ thống.');
        }

        // Kiểm tra trùng email
        const existingEmail = await userRepository.findByEmail(trimmedEmail);
        if (existingEmail) {
            throw new HttpError(409, 'Email này đã được đăng ký cho một tài khoản khác.');
        }

        // Tạo mã userCode nếu không truyền
        let defaultPrefix = 'U';
        if (safeRole === 'LIBRARIAN') defaultPrefix = 'TT';
        else if (safeRole === 'ADMIN') defaultPrefix = 'AD';
        else if (safeRole === 'LECTURER') defaultPrefix = 'GV';

        const finalUserCode = userCode && String(userCode).trim()
            ? String(userCode).trim()
            : defaultPrefix + Date.now().toString().slice(-7);

        const existingCode = await userRepository.findByUserCode(finalUserCode);
        if (existingCode) {
            throw new HttpError(409, 'Mã người dùng (userCode / MSSV) này đã tồn tại trong hệ thống.');
        }

        const passwordHash = bcrypt.hashSync(trimmedPassword, 10);

        const newUser = await userRepository.create({
            userCode: finalUserCode,
            username: trimmedUsername,
            passwordHash,
            fullName: fullName.trim(),
            email: trimmedEmail,
            phone: phone ? String(phone).trim() : null,
            role: safeRole,
            status: safeStatus,
        });

        // Ghi nhật ký hoạt động
        activityLogService.log({
            action: 'CREATE_USER',
            user: currentUser,
            targetType: 'USER',
            targetId: newUser.id,
            details: `Tạo người dùng mới: ${newUser.userCode} - ${newUser.username} (${newUser.role})`,
            ipAddress,
        });

        return newUser;
    },

    // 4. Sửa thông tin người dùng
    async updateUser(id, payload = {}, currentUser, ipAddress) {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            throw new HttpError(400, 'ID người dùng không hợp lệ (phải là số nguyên dương).');
        }

        const user = await userRepository.findById(numericId);
        if (!user) {
            throw new HttpError(404, 'Không tìm thấy người dùng để cập nhật.');
        }

        const fieldsToUpdate = {};

        if (payload.fullName !== undefined) {
            if (typeof payload.fullName !== 'string' || !payload.fullName.trim()) {
                throw new HttpError(400, 'Họ và tên không được để trống.');
            }
            fieldsToUpdate.fullName = payload.fullName.trim();
        }

        if (payload.email !== undefined) {
            if (typeof payload.email !== 'string' || !payload.email.trim()) {
                throw new HttpError(400, 'Email không được để trống.');
            }
            const trimmedEmail = payload.email.trim().toLowerCase();
            if (!EMAIL_REGEX.test(trimmedEmail)) {
                throw new HttpError(400, 'Email không đúng định dạng.');
            }
            const emailInUse = await userRepository.findByEmailExcludeId(trimmedEmail, numericId);
            if (emailInUse) {
                throw new HttpError(409, 'Email này đã được sử dụng bởi một tài khoản khác.');
            }
            fieldsToUpdate.email = trimmedEmail;
        }

        if (payload.phone !== undefined) {
            fieldsToUpdate.phone = payload.phone ? String(payload.phone).trim() : null;
        }

        if (payload.userCode !== undefined) {
            if (typeof payload.userCode !== 'string' || !payload.userCode.trim()) {
                throw new HttpError(400, 'Mã người dùng không được để trống.');
            }
            const trimmedUserCode = payload.userCode.trim();
            const codeInUse = await userRepository.findByUserCodeExcludeId(trimmedUserCode, numericId);
            if (codeInUse) {
                throw new HttpError(409, 'Mã người dùng (userCode) này đã tồn tại trong hệ thống.');
            }
            fieldsToUpdate.userCode = trimmedUserCode;
        }

        if (payload.password !== undefined && payload.password !== null && String(payload.password).trim() !== '') {
            const trimmedPassword = String(payload.password).trim();
            if (trimmedPassword.length < 6) {
                throw new HttpError(400, 'Mật khẩu mới phải có ít nhất 6 ký tự.');
            }
            fieldsToUpdate.passwordHash = bcrypt.hashSync(trimmedPassword, 10);
        }

        if (payload.role !== undefined) {
            const normalizedRole = String(payload.role).trim().toUpperCase();
            if (!ALLOWED_ROLES.includes(normalizedRole)) {
                throw new HttpError(400, `Vai trò người dùng không hợp lệ. Cho phép: ${ALLOWED_ROLES.join(', ')}.`);
            }
            if (currentUser && currentUser.id === numericId && normalizedRole !== 'ADMIN') {
                throw new HttpError(400, 'Không thể tự hạ vai trò Admin của chính mình.');
            }
            fieldsToUpdate.role = normalizedRole;
        }

        if (payload.status !== undefined) {
            const normalizedStatus = String(payload.status).trim().toUpperCase();
            if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
                throw new HttpError(400, `Trạng thái tài khoản không hợp lệ. Cho phép: ${ALLOWED_STATUSES.join(', ')}.`);
            }
            if (currentUser && currentUser.id === numericId && normalizedStatus === 'LOCKED') {
                throw new HttpError(400, 'Không thể tự khóa tài khoản của chính mình.');
            }
            fieldsToUpdate.status = normalizedStatus;
        }

        const updatedUser = await userRepository.update(numericId, fieldsToUpdate);

        // Ghi nhật ký hoạt động
        activityLogService.log({
            action: 'UPDATE_USER',
            user: currentUser,
            targetType: 'USER',
            targetId: numericId,
            details: `Cập nhật thông tin người dùng: ${user.userCode} - ${user.username}`,
            ipAddress,
        });

        return updatedUser;
    },

    // 5. Đổi vai trò người dùng (Role)
    async changeRole(id, role, currentUser, ipAddress) {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            throw new HttpError(400, 'ID người dùng không hợp lệ (phải là số nguyên dương).');
        }

        if (!role || typeof role !== 'string' || !role.trim()) {
            throw new HttpError(400, 'Vai trò mới (role) không được để trống.');
        }

        const normalizedRole = role.trim().toUpperCase();
        if (!ALLOWED_ROLES.includes(normalizedRole)) {
            throw new HttpError(400, `Vai trò người dùng không hợp lệ. Cho phép: ${ALLOWED_ROLES.join(', ')}.`);
        }

        const user = await userRepository.findById(numericId);
        if (!user) {
            throw new HttpError(404, 'Không tìm thấy người dùng để đổi vai trò.');
        }

        if (currentUser && currentUser.id === numericId && normalizedRole !== 'ADMIN') {
            throw new HttpError(400, 'Không thể tự hạ vai trò Admin của chính mình.');
        }

        const updatedUser = await userRepository.updateRole(numericId, normalizedRole);

        // Ghi nhật ký hoạt động
        activityLogService.log({
            action: 'CHANGE_ROLE',
            user: currentUser,
            targetType: 'USER',
            targetId: numericId,
            details: `Thay đổi vai trò người dùng ${user.userCode} từ ${user.role} thành ${normalizedRole}`,
            ipAddress,
        });

        return updatedUser;
    },

    // 6. Đổi trạng thái người dùng (Status)
    async changeStatus(id, status, currentUser, ipAddress) {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            throw new HttpError(400, 'ID người dùng không hợp lệ (phải là số nguyên dương).');
        }

        if (!status || typeof status !== 'string' || !status.trim()) {
            throw new HttpError(400, 'Trạng thái (status) không được để trống.');
        }

        const normalizedStatus = status.trim().toUpperCase();
        if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
            throw new HttpError(400, `Trạng thái tài khoản không hợp lệ. Cho phép: ${ALLOWED_STATUSES.join(', ')}.`);
        }

        const user = await userRepository.findById(numericId);
        if (!user) {
            throw new HttpError(404, 'Không tìm thấy người dùng để đổi trạng thái.');
        }

        if (currentUser && currentUser.id === numericId && normalizedStatus === 'LOCKED') {
            throw new HttpError(400, 'Không thể tự khóa tài khoản của chính mình.');
        }

        const updatedUser = await userRepository.updateStatus(numericId, normalizedStatus);

        // Ghi nhật ký hoạt động
        activityLogService.log({
            action: 'CHANGE_STATUS',
            user: currentUser,
            targetType: 'USER',
            targetId: numericId,
            details: `Thay đổi trạng thái người dùng ${user.userCode} từ ${user.status} thành ${normalizedStatus}`,
            ipAddress,
        });

        return updatedUser;
    },

    // 7. Xóa người dùng
    async deleteUser(id, currentUser, ipAddress) {
        const numericId = Number(id);
        if (!Number.isSafeInteger(numericId) || numericId <= 0) {
            throw new HttpError(400, 'ID người dùng không hợp lệ (phải là số nguyên dương).');
        }

        const user = await userRepository.findById(numericId);
        if (!user) {
            throw new HttpError(404, 'Không tìm thấy người dùng để xóa.');
        }

        if (currentUser && currentUser.id === numericId) {
            throw new HttpError(400, 'Không thể tự xóa tài khoản của chính mình.');
        }

        // Kiểm tra ràng buộc mượn trả và phạt
        const constraints = await userRepository.checkUserConstraints(numericId);

        if (constraints.activeLoans > 0) {
            throw new HttpError(400, `Không thể xóa người dùng đang mượn ${constraints.activeLoans} cuốn sách. Vui lòng chuyển trạng thái sang LOCKED thay thế.`);
        }

        if (constraints.unpaidFines > 0) {
            throw new HttpError(400, `Không thể xóa người dùng đang có ${constraints.unpaidFines} khoản phạt chưa thanh toán. Vui lòng chuyển trạng thái sang LOCKED thay thế.`);
        }

        if (constraints.totalBorrowRecords > 0 || constraints.totalBorrowRequests > 0 || constraints.totalFines > 0) {
            throw new HttpError(409, 'Không thể xóa người dùng do có dữ liệu lịch sử mượn trả hoặc yêu cầu sách trong hệ thống. Hãy chuyển trạng thái sang LOCKED để bảo toàn dữ liệu.');
        }

        await userRepository.delete(numericId);

        // Ghi nhật ký hoạt động
        activityLogService.log({
            action: 'DELETE_USER',
            user: currentUser,
            targetType: 'USER',
            targetId: numericId,
            details: `Xóa tài khoản người dùng: ${user.userCode} - ${user.username}`,
            ipAddress,
        });

        return {
            success: true,
            message: 'Xóa người dùng thành công.',
        };
    },
};

module.exports = userService;
