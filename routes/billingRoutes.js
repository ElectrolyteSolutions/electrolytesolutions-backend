const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');


// Map endpoints to controller methods
router.get('/:id',protect,authorizeRoles('admin'), billController.getBillById);
router.put('/:id',protect,authorizeRoles('admin'), billController.updateBill);
router.post('/:id/return-bill',protect,authorizeRoles('admin'), billController.processReturnBill);router.get('/', billController.getBills);          // Fetch all invoices
router.post('/',protect,authorizeRoles('admin'), billController.createBill);       // Process a new transaction (updates inventory)
router.delete('/:id',protect,authorizeRoles('admin'), billController.deleteBill); // Clean up invoice records
router.get('/public/:token',billController.getPublicBill)

module.exports = router;