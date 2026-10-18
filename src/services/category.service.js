
const categoryRepository = require('../repositories/category.repository');

const createError = (statusCode, message) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
};

const getCategories = async (keyword) => {
    return categoryRepository.findAll(keyword?.trim() || undefined);
};

const getCategoryByName = async (name) => {
    const category = await categoryRepository.findByName(name);

    if (!category) {
        throw createError(404, 'Không tìm thấy danh mục.');
    }

    return category;
};

const createCategory = async ({ Name, Description }) => {
    const name = Name?.trim();

    if (!name) {
        throw createError(400, 'Tên danh mục là bắt buộc.');
    }

    const existing = await categoryRepository.findByName(name);

    if (existing) {
        throw createError(409, 'Danh mục đã tồn tại.');
    }

    return categoryRepository.create(
        name,
        Description?.trim() || null
    );
};

const updateCategory = async (oldName, { Name, Description }) => {
    const newName = Name?.trim();

    if (!oldName || !newName) {
        throw createError(
            400,
            'Tên danh mục hiện tại và tên mới là bắt buộc.'
        );
    }

    const existing = await categoryRepository.findByName(oldName);

    if (!existing) {
        throw createError(404, 'Không tìm thấy danh mục cần cập nhật.');
    }

    if (oldName !== newName) {
        const duplicate = await categoryRepository.findByName(newName);

        if (duplicate) {
            throw createError(409, 'Tên danh mục mới đã tồn tại.');
        }

        if (await categoryRepository.isUsedByBooks(oldName)) {
            throw createError(
                409,
                'Danh mục đang được sách sử dụng, không thể đổi tên trực tiếp.'
            );
        }
    }

    return categoryRepository.update(
        oldName,
        newName,
        Description?.trim() || null
    );
};

const deleteCategory = async (name) => {
    const existing = await categoryRepository.findByName(name);

    if (!existing) {
        throw createError(404, 'Không tìm thấy danh mục cần xóa.');
    }

    if (await categoryRepository.isUsedByBooks(name)) {
        throw createError(
            409,
            'Không thể xóa danh mục đang được sách sử dụng.'
        );
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
