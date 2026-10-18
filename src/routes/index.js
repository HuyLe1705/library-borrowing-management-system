const express = require('express');
const bookRoutes = require('./book.routes');
const bookController = require('../controllers/book.controller');

const router = express.Router();

router.use('/books', bookRoutes);
router.get('/categories', bookController.getCategories);

module.exports = router;