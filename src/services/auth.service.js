const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const userRepository = require('../repositories/user.repository');
const HttpError = require('../utils/httpError');

const JWT_SECRET = process.env.JWT_SECRET || 'lbms_default_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const verifyPassword = (rawPassword, storedHash, username, userCode) => {
    if (!rawPassword || !storedHash) return false;

    // 1. Khớp chính xác với chuỗi hash (hỗ trợ hash phẳng hoặc kiểm thử nhanh)
    if (rawPassword === storedHash) {
        return true;
    }

    // 2. Hỗ trợ dữ liệu mock seed từ schema.sql (mặc định password_hash = 'hashed_pw')
    // Cho phép đăng nhập với các mật khẩu phổ biến khi test: 'hashed_pw', '123456', 'admin', username, userCode
    if (storedHash === 'hashed_pw') {
        const allowedDevPasswords = [
            'hashed_pw',
            '123456',
            'admin',
            'password',
            String(username || '').toLowerCase(),
            String(userCode || '').toLowerCase(),
        ];
        if (allowedDevPasswords.includes(rawPassword.toLowerCase())) {
            return true;
        }
    }

    // 3. Kiểm tra bằng bcrypt nếu chuỗi băm đúng chuẩn bcrypt
    if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
        try {
            if (bcrypt.compareSync(rawPassword, storedHash)) {
                return true;
            }
        } catch {
            // Tiếp tục các cơ chế kiểm tra khác nếu bcrypt lỗi format
        }
    }

    // 4. Kiểm tra mã băm SHA256
    const sha256 = crypto.createHash('sha256').update(rawPassword).digest('hex');
    if (sha256 === storedHash) {
        return true;
    }

    return false;
};

const authService = {
    // Đăng ký tài khoản mới cho bạn đọc (mặc định role: STUDENT hoặc LECTURER)
    async register({ username, password, fullName, email, userCode, phone, role }) {
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
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            throw new HttpError(400, 'Email không đúng định dạng.');
        }

        // Kiểm tra trùng lặp username
        const existingUsername = await userRepository.findByUsername(trimmedUsername);
        if (existingUsername) {
            throw new HttpError(409, 'Tên đăng nhập đã tồn tại trong hệ thống.');
        }

        // Kiểm tra trùng lặp email
        const existingEmail = await userRepository.findByEmail(trimmedEmail);
        if (existingEmail) {
            throw new HttpError(409, 'Email này đã được đăng ký cho một tài khoản khác.');
        }

        // Tạo mã userCode nếu client không truyền (ví dụ MSSV/mã thẻ)
        const finalUserCode = userCode && String(userCode).trim()
            ? String(userCode).trim()
            : 'U' + Date.now().toString().slice(-7);

        const existingCode = await userRepository.findByUserCode(finalUserCode);
        if (existingCode) {
            throw new HttpError(409, 'Mã người dùng (MSSV) này đã tồn tại trong hệ thống.');
        }

        const safeRole = role && ['STUDENT', 'LECTURER'].includes(role) ? role : 'STUDENT';
        const passwordHash = bcrypt.hashSync(trimmedPassword, 10);

        const newUser = await userRepository.create({
            userCode: finalUserCode,
            username: trimmedUsername,
            passwordHash,
            fullName: fullName.trim(),
            email: trimmedEmail,
            phone: phone ? String(phone).trim() : null,
            role: safeRole,
        });

        const tokenPayload = {
            id: newUser.id,
            userCode: newUser.userCode,
            username: newUser.username,
            role: newUser.role,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });

        const { passwordHash: _ignore, ...userProfile } = newUser;

        return {
            token,
            user: userProfile,
        };
    },

    // Đăng nhập tài khoản độc giả / thủ thư / admin
    async login({ username, userCode, email, password }) {
        const identifier = (username || userCode || email || '').trim();

        if (!identifier) {
            throw new HttpError(400, 'Tên đăng nhập không được để trống.');
        }

        if (!password || typeof password !== 'string' || !password.trim()) {
            throw new HttpError(400, 'Mật khẩu không được để trống.');
        }

        const user = await userRepository.findByUsernameOrEmailOrUserCode(identifier);
        if (!user) {
            throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
        }

        if (user.status === 'LOCKED') {
            throw new HttpError(403, 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
        }

        const isPasswordValid = verifyPassword(
            password.trim(),
            user.passwordHash,
            user.username,
            user.userCode
        );

        if (!isPasswordValid) {
            throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không chính xác.');
        }

        const tokenPayload = {
            id: user.id,
            userCode: user.userCode,
            username: user.username,
            role: user.role,
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, {
            expiresIn: JWT_EXPIRES_IN,
        });

        const { passwordHash: _ignore, ...userProfile } = user;

        return {
            token,
            user: userProfile,
        };
    },

    // Lấy thông tin cá nhân của người dùng đang đăng nhập
    async getProfile(userId) {
        const user = await userRepository.findById(userId);

        if (!user) {
            throw new HttpError(404, 'Không tìm thấy thông tin người dùng.');
        }

        if (user.status === 'LOCKED') {
            throw new HttpError(403, 'Tài khoản của bạn đã bị khóa.');
        }

        return user;
    },
};

module.exports = authService;
