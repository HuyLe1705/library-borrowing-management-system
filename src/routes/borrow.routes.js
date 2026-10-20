const express = require('express');
const borrowController = require('../controllers/borrow.controller');

const router = express.Router();

/**
 * @openapi
 * /api/borrows:
 *   get:
 *     summary: Lấy danh sách phiếu mượn sách (hỗ trợ lọc theo mã độc giả, mã vạch, trạng thái)
 *     tags: [Borrows]
 *     parameters:
 *       - in: query
 *         name: userCode
 *         schema:
 *           type: string
 *         example: "2311159"
 *         description: Lọc theo mã độc giả (MSSV / Mã Giảng viên)
 *       - in: query
 *         name: barcode
 *         schema:
 *           type: string
 *         example: "BC-SE-001"
 *         description: Lọc theo mã vạch của bản sao sách vật lý
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [BORROWED, RETURNED, OVERDUE]
 *         description: Trạng thái của phiếu mượn
 *     responses:
 *       200:
 *         description: Danh sách các giao dịch mượn/trả sách.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Lấy danh sách giao dịch mượn trả thành công."
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BorrowRecord'
 *
 * /api/borrows/checkout:
 *   post:
 *     summary: Tạo phiếu mượn sách mới (Checkout)
 *     description: Áp dụng quy tắc hạn mức (Sinh viên tối đa 5 cuốn/14 ngày, Giảng viên tối đa 10 cuốn/30 ngày). Chặn độc giả bị khóa thẻ, nợ phạt hoặc có sách quá hạn. ID phiếu mượn do CSDL tự tăng.
 *     tags: [Borrows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userCode
 *               - barcode
 *             properties:
 *               userCode:
 *                 type: string
 *                 example: "2311159"
 *                 description: "Mã sinh viên hoặc mã giảng viên mượn sách"
 *               barcode:
 *                 type: string
 *                 example: "BC-SE-001"
 *                 description: "Mã vạch của bản sao sách vật lý"
 *               librarianCode:
 *                 type: string
 *                 example: "TT001"
 *                 description: "Mã thủ thư phụ trách quầy mượn (mặc định: TT001)"
 *     responses:
 *       201:
 *         description: Ghi nhận mượn sách thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Ghi nhận mượn sách thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 10
 *                     borrowDate:
 *                       type: string
 *                       format: date
 *                       example: "2026-10-20"
 *                     dueDate:
 *                       type: string
 *                       format: date
 *                       example: "2026-11-03"
 *                     status:
 *                       type: string
 *                       example: "BORROWED"
 *       400:
 *         description: Thiếu thông tin hoặc độc giả đã đạt giới hạn mượn sách tối đa.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Thẻ độc giả đang bị khóa hoặc có sách quá hạn / nợ tiền phạt chưa nộp.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy độc giả hoặc mã vạch sách.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Cuốn sách đang có người khác mượn hoặc độc giả đang mượn một bản sao khác của cùng đầu sách.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/borrows/return:
 *   post:
 *     summary: Trả sách (Return) theo mã Barcode
 *     description: Tự động tính tiền phạt (5.000 VNĐ / ngày trễ hạn), tạo bản ghi fines và khóa thẻ độc giả nếu quá hạn.
 *     tags: [Borrows]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - barcode
 *             properties:
 *               barcode:
 *                 type: string
 *                 example: "BC-SE-001"
 *                 description: "Mã vạch cuốn sách cần trả"
 *               librarianCode:
 *                 type: string
 *                 example: "TT001"
 *                 description: "Mã thủ thư tiếp nhận sách trả"
 *     responses:
 *       200:
 *         description: Trả sách thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Trả sách đúng hạn thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     borrowId:
 *                       type: integer
 *                       example: 1
 *                     barcode:
 *                       type: string
 *                       example: "BC-SE-001"
 *                     status:
 *                       type: string
 *                       example: "RETURNED"
 *                     overdueDays:
 *                       type: integer
 *                       example: 0
 *                     fine:
 *                       type: object
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Mã vạch không được để trống.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy giao dịch đang mượn nào ứng với mã Barcode này.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/borrows/{id}/renew:
 *   post:
 *     summary: Gia hạn thời gian mượn sách (+7 ngày)
 *     description: Mỗi phiếu mượn chỉ được gia hạn tối đa 1 lần, chỉ áp dụng cho sách chưa quá hạn và độc giả không nợ phạt.
 *     tags: [Borrows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của phiếu mượn cần gia hạn
 *         example: 1
 *     responses:
 *       200:
 *         description: Gia hạn sách thành công (+7 ngày).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Gia hạn sách thành công (+7 ngày)."
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     newDueDate:
 *                       type: string
 *                       format: date
 *                       example: "2026-11-09"
 *                     renewalCount:
 *                       type: integer
 *                       example: 1
 *       400:
 *         description: Sách đã quá hạn hoặc đã hết số lần gia hạn cho phép (1 lần).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Độc giả đang bị khóa thẻ, có sách quá hạn khác hoặc nợ tiền phạt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy phiếu mượn.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * /api/borrows/fines/{id}/pay:
 *   patch:
 *     summary: Thanh toán tiền phạt quá hạn và tự động mở khóa thẻ cho độc giả
 *     description: Ghi nhận thanh toán khoản phạt (fines.id) và mở lại trạng thái ACTIVE cho độc giả nếu không còn khoản phạt hay sách quá hạn nào khác.
 *     tags: [Borrows]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID của khoản phạt cần nộp (fines.id)
 *         example: 1
 *     responses:
 *       200:
 *         description: Thanh toán tiền phạt và mở khóa thẻ thành công.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Ghi nhận thanh toán tiền phạt và mở khóa thẻ thành công."
 *                 data:
 *                   type: object
 *                   properties:
 *                     fineId:
 *                       type: integer
 *                       example: 1
 *                     status:
 *                       type: string
 *                       example: "PAID"
 *       400:
 *         description: Khoản phạt này đã được thanh toán trước đó.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Không tìm thấy phiếu phạt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', borrowController.getBorrows);
router.post('/checkout', borrowController.borrowBook);
router.post('/return', borrowController.returnBook);
router.post('/:id/renew', borrowController.renewBorrow);
router.patch('/fines/:id/pay', borrowController.payFine);

module.exports = router;
