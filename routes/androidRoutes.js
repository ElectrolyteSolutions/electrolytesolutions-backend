const express = require('express');
const router = express.Router();
const { registerAndroid, broadcastNotification } = require('../controllers/androidController');

router.post('/register', registerAndroid);
router.post('/broadcast', broadcastNotification);

module.exports = router;