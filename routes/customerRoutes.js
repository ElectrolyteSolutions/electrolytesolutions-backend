const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');


router.get('/',protect,authorizeRoles('admin'), customerController.getCustomers);
router.post('/',protect,authorizeRoles('admin'), customerController.createCustomer);
router.put('/:id',protect,authorizeRoles('admin'), customerController.updateCustomer);
router.delete('/:id',protect,authorizeRoles('admin'), customerController.deleteCustomer);

module.exports = router;