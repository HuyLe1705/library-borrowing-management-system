const express = require('express');
const borrowController = require('../controllers/borrow.controller');

const router = express.Router();

/**
 * @openapi
 * /api/borrows:
 *   get:
 *     summary: Lấy danh sách phiếu mượn sách
 *     tags: [Borrows]
 */
router.get('/', borrowController.getBorrows);

/**
 * @openapi
 * /api/borrows/checkout:
 *   post:
 *     summary: Tạo phiếu mượn sách mới (Checkout)
 *     tags: [Borrows]
 */
router.post('/checkout', borrowController.borrowBook);

/**
 * @openapi
 * /api/borrows/return:
 *   post:
 *     summary: Trả sách (Return)
 *     tags: [Borrows]
 */
router.post('/return', borrowController.returnBook);

/**
 * @openapi
 * /api/borrows/{id}/renew:
 *   post:
 *     summary: Gia hạn thời gian mượn sách
 *     tags: [Borrows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của phiếu mượn cần gia hạn
 */
router.post('/:id/renew', borrowController.renewBorrow);

/**
 * @openapi
 * /api/borrows/fines/{id}/pay:
 *   patch:
 *     summary: Nộp tiền phạt quá hạn
 *     tags: [Borrows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của khoản phạt/phiếu mượn
 */
router.patch('/fines/:id/pay', borrowController.payFine);

module.exports = router;
