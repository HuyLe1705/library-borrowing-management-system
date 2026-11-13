const HttpError = require('../utils/httpError');
const asyncHandler = require('../utils/asyncHandler');

const uploadController = {
    uploadImage: asyncHandler(async (req, res) => {
        if (!req.file) {
            throw new HttpError(400, 'Vui lòng chọn file ảnh để tải lên (trường form-data: "image" hoặc "file").');
        }

        const protocol = req.protocol;
        const host = req.get('host');
        const coverUrl = `${protocol}://${host}/uploads/${req.file.filename}`;

        res.status(201).json({
            success: true,
            message: 'Tải ảnh lên máy chủ thành công.',
            data: {
                filename: req.file.filename,
                coverUrl,
                url: coverUrl,
                size: req.file.size,
                mimetype: req.file.mimetype,
            },
        });
    }),
};

module.exports = uploadController;
