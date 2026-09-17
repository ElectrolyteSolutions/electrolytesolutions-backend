const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const verifyToken = require('../middleware/customerMiddleware');

router.get('/', customerController.getCustomers);
router.post('/register', customerController.registerCustomer);
router.post('/login', customerController.loginCustomer);
router.post('/google', customerController.googleOAuth);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);
router.get('/profile', verifyToken, customerController.getProfile);

module.exports = router;