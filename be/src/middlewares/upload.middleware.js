const multer = require('multer');
const path = require('path');
const fs = require('fs');
const HttpError = require('../utils/httpError');

const uploadDir = path.join(__dirname, '../../uploads');

// Tự động tạo thư mục uploads nếu chưa có
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình nơi lưu và cách đặt tên file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'book-' + uniqueSuffix + ext);
    },
});

// Kiểm tra định dạng file ảnh hợp lệ
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
        cb(null, true);
    } else {
        cb(new HttpError(400, 'Chỉ chấp nhận các file ảnh có định dạng JPG, JPEG, PNG, WEBP, GIF.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // Tối đa 100MB
    },
});

module.exports = upload;
