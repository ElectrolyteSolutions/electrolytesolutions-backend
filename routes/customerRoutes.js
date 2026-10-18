const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const verifyToken = require('../middleware/customerMiddleware');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

router.post('/register', customerController.registerCustomer);
router.post('/login', customerController.loginCustomer);
router.post('/google', customerController.googleOAuth);
router.get('/profile', verifyToken, customerController.getProfile);

router.get('/',protect,authorizeRoles('admin'), customerController.getCustomers);
router.post('/',protect,authorizeRoles('admin'), customerController.createCustomer);
router.put('/:id',protect,authorizeRoles('admin'), customerController.updateCustomer);
router.delete('/:id',protect,authorizeRoles('admin'), customerController.deleteCustomer);

module.exports = router;