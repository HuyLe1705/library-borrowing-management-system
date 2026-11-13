const router = require('express').Router();
const controller = require('../controllers/fine.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
router.use(authenticate);
router.get('/', controller.list);
router.post('/', authorize('LIBRARIAN','ADMIN'), controller.create);
router.patch('/:id/pay', authorize('LIBRARIAN','ADMIN'), controller.pay);
module.exports = router;
