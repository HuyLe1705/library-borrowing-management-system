const HttpError = require('./httpError');

exports.id = (value) => {
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result <= 0) throw new HttpError(400, 'Mã định danh phải là số nguyên dương.');
    return result;
};
exports.note = (value, max = 500) => {
    if (value == null) return null;
    if (typeof value !== 'string' || value.trim().length > max) throw new HttpError(400, `Ghi chú tối đa ${max} ký tự.`);
    return value.trim() || null;
};
exports.staff = (user) => ['ADMIN', 'LIBRARIAN'].includes(user?.role);
exports.date = (value) => {
    const parsed = new Date(value);
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value) {
        throw new HttpError(400, 'Ngày không hợp lệ, cần định dạng YYYY-MM-DD.');
    }
    return value;
};
