const express = require('express');
const router = express.Router();
const { 
  createCart, 
  getCart, 
  addToCart, 
  updateCartItem, 
  removeCartItem 
} = require('../controllers/cartController');

router.post('/create', createCart);
router.get('/:cartId', getCart);
router.post('/add', addToCart);
router.put('/update', updateCartItem);
router.post('/remove', removeCartItem);

module.exports = router;