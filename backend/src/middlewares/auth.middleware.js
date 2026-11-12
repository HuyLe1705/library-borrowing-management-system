const jwt = require('jsonwebtoken');
const HttpError = require('../utils/httpError');

const JWT_SECRET = process.env.JWT_SECRET || 'lbms_default_jwt_secret_key_2026';

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }

    if (!token) {
        return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.'));
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return next(new HttpError(401, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
        }
        return next(new HttpError(401, 'Token xác thực không hợp lệ.'));
    }
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục.'));
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
            return next(new HttpError(403, 'Bạn không có quyền thực hiện hành động này.'));
        }

        next();
    };
};

module.exports = {
    authenticate,
    authorize,
};
