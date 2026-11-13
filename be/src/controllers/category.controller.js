
const categoryService = require('../services/category.service');

const handleError = (res, error, operation) => {
    const status = error.status || error.statusCode || 500;
    if (status >= 500) {
        console.error(`${operation}:`, error);
    }

    return res.status(status).json({
        success: false,
        message:
            error.status || error.statusCode
                ? error.message
                : 'Đã xảy ra lỗi máy chủ.',
    });
};

const getCategories = async (req, res) => {
    try {
        const data = await categoryService.getCategories(
            req.query.keyword
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return handleError(res, error, 'getCategories');
    }
};

const getCategoryByName = async (req, res) => {
    try {
        const data = await categoryService.getCategoryByName(
            req.params.name
        );

        return res.status(200).json({
            success: true,
            data,
        });
    } catch (error) {
        return handleError(res, error, 'getCategoryByName');
    }
};

const createCategory = async (req, res) => {
    try {
        const data = await categoryService.createCategory(req.body);

        return res.status(201).json({
            success: true,
            message: 'Tạo danh mục thành công.',
            data,
        });
    } catch (error) {
        return handleError(res, error, 'createCategory');
    }
};

const updateCategory = async (req, res) => {
    try {
        const data = await categoryService.updateCategory(
            req.params.name,
            req.body
        );

        return res.status(200).json({
            success: true,
            message: 'Cập nhật danh mục thành công.',
            data,
        });
    } catch (error) {
        return handleError(res, error, 'updateCategory');
    }
};

const deleteCategory = async (req, res) => {
    try {
        const data = await categoryService.deleteCategory(
            req.params.name
        );

        return res.status(200).json({
            success: true,
            ...data,
        });
    } catch (error) {
        return handleError(res, error, 'deleteCategory');
    }
};

module.exports = {
    getCategories,
    getCategoryByName,
    createCategory,
    updateCategory,
    deleteCategory,
};
