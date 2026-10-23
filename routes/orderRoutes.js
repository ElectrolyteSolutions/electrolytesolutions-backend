const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/customerMiddleware');

router.post('/create-razorpay-order', verifyToken, orderController.createRazorpayOrder);
router.post('/verify-payment', verifyToken, orderController.verifyAndCreateOrder);

module.exports = router;