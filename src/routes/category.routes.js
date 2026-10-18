
const express = require('express');
const categoryController = require('../controllers/category.controller');

const router = express.Router();

router.get('/', categoryController.getCategories);
router.get('/:name', categoryController.getCategoryByName);
router.post('/', categoryController.createCategory);
router.put('/:name', categoryController.updateCategory);
router.delete('/:name', categoryController.deleteCategory);

module.exports = router;
