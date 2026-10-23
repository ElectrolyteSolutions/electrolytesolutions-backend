const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const verifyToken = require('../middleware/customerMiddleware'); // Adjust path as per your setup

// Razorpay Online Payment Routes
router.post('/create-razorpay-order', verifyToken, orderController.createRazorpayOrder);
router.post('/verify-payment', verifyToken, orderController.verifyAndCreateOrder);

// Cash on Delivery Route
router.post('/create-cod-order', verifyToken, orderController.createCodOrder);

// ERP Dashboard Order Management Routes
router.get('/', orderController.getAllOrders);
router.put('/:id', orderController.updateOrderStatus);
router.delete('/:id', orderController.deleteOrder);

module.exports = router;