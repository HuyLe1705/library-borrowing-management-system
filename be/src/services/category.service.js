const categoryRepository = require('../repositories/category.repository');
const HttpError = require('../utils/httpError');

const getCategories = async (keyword) => {
    return categoryRepository.findAll(keyword?.trim() || undefined);
};

const getCategoryByName = async (name) => {
    const category = await categoryRepository.findByName(name);
    if (!category) {
        throw new HttpError(404, 'Không tìm thấy danh mục.');
    }
    return category;
};

const createCategory = async (payload = {}) => {
    const rawName = payload.name ?? payload.Name;
    const rawDesc = payload.description ?? payload.Description;
    const name = rawName?.trim();

    if (!name) {
        throw new HttpError(400, 'Tên danh mục là bắt buộc.');
    }

    const existing = await categoryRepository.findByName(name);
    if (existing) {
        throw new HttpError(409, 'Danh mục đã tồn tại.');
    }

    return categoryRepository.create(name, rawDesc?.trim() || null);
};

const updateCategory = async (oldName, payload = {}) => {
    const rawName = payload.name ?? payload.Name;
    const rawDesc = payload.description ?? payload.Description;
    const newName = rawName?.trim();

    if (!oldName || !newName) {
        throw new HttpError(400, 'Tên danh mục hiện tại và tên mới là bắt buộc.');
    }

    const existing = await categoryRepository.findByName(oldName);
    if (!existing) {
        throw new HttpError(404, 'Không tìm thấy danh mục cần cập nhật.');
    }

    if (oldName !== newName) {
        const duplicate = await categoryRepository.findByName(newName);
        if (duplicate) {
            throw new HttpError(409, 'Tên danh mục mới đã tồn tại.');
        }
    }

    return categoryRepository.update(oldName, newName, rawDesc?.trim() || null);
};

const deleteCategory = async (name) => {
    const existing = await categoryRepository.findByName(name);
    if (!existing) {
        throw new HttpError(404, 'Không tìm thấy danh mục cần xóa.');
    }

    if (await categoryRepository.isUsedByBooks(name)) {
        throw new HttpError(409, 'Không thể xóa danh mục đang được sách sử dụng.');
    }

    await categoryRepository.remove(name);
    return { message: 'Xóa danh mục thành công.' };
};

module.exports = {
    getCategories,
    getCategoryByName,
    createCategory,
    updateCategory,
    deleteCategory,
};