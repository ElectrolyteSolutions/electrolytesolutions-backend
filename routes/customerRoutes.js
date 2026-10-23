const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const verifyToken = require('../middleware/customerMiddleware');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Customer profile and address management routes
router.post('/register', customerController.registerCustomer);
router.post('/login', customerController.loginCustomer);
router.post('/google', customerController.googleOAuth);
router.get('/profile', verifyToken, customerController.getProfile);
router.put('/profile', verifyToken, customerController.updateProfile);
router.post('/address', verifyToken, customerController.addAddress);
router.put('/address/:addressId', verifyToken, customerController.updateAddress);
router.delete('/address/:addressId', verifyToken, customerController.deleteAddress);

router.get('/',protect,authorizeRoles('admin'), customerController.getCustomers);
router.post('/',protect,authorizeRoles('admin'), customerController.createCustomer);
router.put('/:id',protect,authorizeRoles('admin'), customerController.updateCustomer);
router.delete('/:id',protect,authorizeRoles('admin'), customerController.deleteCustomer);

module.exports = router;