const express = require('express');
const router = express.Router();
const { 
  getOrCreateCart, 
  addToCart, 
  updateCartItem, 
  removeCartItem 
} = require('../controllers/cartController');

router.get('/', getOrCreateCart); // Pass ?customerId=... or ?cartId=...
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.post('/remove', removeCartItem);

module.exports = router;