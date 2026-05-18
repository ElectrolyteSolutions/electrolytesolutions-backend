const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');

// Define specific endpoints
router.get('/', deviceController.getDevices);                      // GET all
router.get('/customer/:customerId', deviceController.getDevicesByCustomer); // GET by customer
router.post('/', deviceController.createDevice);                   // POST new
router.put('/:id', deviceController.updateDevice);                 // PUT update
router.delete('/:id', deviceController.deleteDevice);              // DELETE

module.exports = router;