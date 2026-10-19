const express = require('express');
const borrowController = require('../controllers/borrow.controller');

const router = express.Router();

router.get('/', borrowController.getBorrows);
router.post('/checkout', borrowController.borrowBook);
router.post('/return', borrowController.returnBook);
router.post('/:id/renew', borrowController.renewBorrow);
router.patch('/fines/:id/pay', borrowController.payFine);

module.exports = router;