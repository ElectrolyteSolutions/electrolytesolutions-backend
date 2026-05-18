const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');

// Map endpoints to controller methods
router.get('/:id', billController.getBillById);
router.post('/:id/return-bill', billController.processReturnBill);router.get('/', billController.getBills);          // Fetch all invoices
router.post('/', billController.createBill);       // Process a new transaction (updates inventory)
router.delete('/:id', billController.deleteBill);  // Clean up invoice records

module.exports = router;