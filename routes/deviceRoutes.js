const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/deviceController');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');


// Define specific endpoints
router.get('/',protect,authorizeRoles('admin'), deviceController.getDevices);                      // GET all
router.get('/customer/:customerId',protect,authorizeRoles('admin'), deviceController.getDevicesByCustomer); // GET by customer
router.post('/',protect,authorizeRoles('admin'), deviceController.createDevice);                   // POST new
router.put('/:id',protect,authorizeRoles('admin'), deviceController.updateDevice);                 // PUT update
router.delete('/:id',protect,authorizeRoles('admin'), deviceController.deleteDevice);              // DELETE

module.exports = router;