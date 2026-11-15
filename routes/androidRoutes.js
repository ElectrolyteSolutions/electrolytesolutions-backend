const express = require('express');
const router = express.Router();
const androidController = require('../controllers/androidController');

router.post('/register', androidController.registerAndroid);
router.get('/devices', androidController.listDevices);
router.delete('/devices/:id', androidController.deleteDeviceById);
router.delete('/token', androidController.deleteDeviceByToken);
router.delete('/devices', androidController.deleteAllDevices);
router.post('/broadcast', androidController.broadcastNotification);
router.post('/send-to-device', androidController.sendToDevice);

module.exports = router;