const Cart = require('../models/Carts');
const Product = require('../models/Products');
const crypto = require('crypto');

// Helper function to recalculate totals
const calculateTotals = (cart) => {
  cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// Create a new cart
exports.createCart = async (req, res) => {
  try {
    const { customerId } = req.body;
    const cartId = `CART-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    if (customerId) {
      let existingCart = await Cart.findOne({ customerId }).populate('items.productId');
      if (existingCart) return res.status(200).json(existingCart);
    }

    const newCart = new Cart({ 
      cartId, 
      customerId: customerId || null, 
      items: [], 
      totalQuantity: 0, 
      subtotal: 0 
    });
    
    await newCart.save();
    res.status(201).json(newCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get cart details
exports.getCart = async (req, res) => {
  try {
    const { cartId } = req.params;
    const cart = await Cart.findOne({ cartId }).populate('items.productId');
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add item to cart (or update quantity if it already exists)
exports.addToCart = async (req, res) => {
  try {
    const { cartId, productId, quantity = 1 } = req.body;
    
    const cart = await Cart.findOne({ cartId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({ 
        productId, 
        quantity: Number(quantity), 
        price: product.price 
      });
    }

    calculateTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findOne({ cartId }).populate('items.productId');
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Remove or update item quantity explicitly
exports.updateCartItem = async (req, res) => {
  try {
    const { cartId, productId, quantity } = req.body;

    const cart = await Cart.findOne({ cartId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ error: 'Item not found in cart' });

    if (quantity <= 0) {
      // Remove item completely if quantity is 0 or less
      cart.items.splice(itemIndex, 1);
    } else {
      // Update to exact new quantity
      cart.items[itemIndex].quantity = Number(quantity);
    }

    calculateTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findOne({ cartId }).populate('items.productId');
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Completely remove an item from the cart
exports.removeCartItem = async (req, res) => {
  try {
    const { cartId, productId } = req.body;

    const cart = await Cart.findOne({ cartId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    calculateTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findOne({ cartId }).populate('items.productId');
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};