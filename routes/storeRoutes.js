const express = require('express');
const router = express.Router();
const storeController = require('../controllers/storeController');
const { protect,authorizeRoles } = require('../middleware/authMiddleware'); // Use your auth middlewares

router.get('/', storeController.getStoreInfo);
router.put('/', protect,authorizeRoles('admin'), storeController.updateStoreInfo);

module.exports = router;