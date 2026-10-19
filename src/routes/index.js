const express = require('express');
const bookRoutes = require('./book.routes');
const categoryRoutes = require('./category.routes');
const borrowRoutes = require('./borrow.routes');

const router = express.Router();

router.use('/books', bookRoutes);
router.use('/categories', categoryRoutes);
router.use('/borrows', borrowRoutes);

module.exports = router;