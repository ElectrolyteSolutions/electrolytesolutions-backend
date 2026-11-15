const express = require('express');
const router = express.Router();
const { registerAndroid, broadcastNotification ,sendToDevice} = require('../controllers/androidController');

router.post('/register', registerAndroid);
router.post('/broadcast', broadcastNotification);
router.post('/send-to-device', sendToDevice);

module.exports = router;