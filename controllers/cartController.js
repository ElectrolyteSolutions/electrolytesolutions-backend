const Cart = require('../models/Carts');
const Product = require('../models/Products');
const crypto = require('crypto');

const calculateTotals = (cart) => {
  cart.totalQuantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// Helper to find a cart using either customerId or cartId, with automatic merging if both exist
const findAndMergeCart = async (customerId, cartId) => {
  let cart = null;

  // 1. Try finding by customerId first if logged in
  if (customerId) {
    cart = await Cart.findOne({ customerId });
    
    // If user logged in and had a guest cartId passed along, merge guest cart into customer cart
    if (cartId) {
      const guestCart = await Cart.findOne({ cartId, customerId: null });
      if (guestCart) {
        if (cart) {
          // Merge guest items into existing customer cart
          guestCart.items.forEach(guestItem => {
            const existingIndex = cart.items.findIndex(
              i => i.productId.toString() === guestItem.productId.toString()
            );
            if (existingIndex > -1) {
              cart.items[existingIndex].quantity += guestItem.quantity;
            } else {
              cart.items.push(guestItem);
            }
          });
          calculateTotals(cart);
          await cart.save();
          await Cart.findByIdAndDelete(guestCart._id); // Delete old guest cart
        } else {
          // Assign guest cart to customer
          guestCart.customerId = customerId;
          cart = guestCart;
          await cart.save();
        }
      }
    }
  }

  // 2. If no customer cart yet, look up by guest cartId
  if (!cart && cartId) {
    cart = await Cart.findOne({ cartId });
  }

  return cart;
};

exports.getOrCreateCart = async (req, res) => {
  try {
    const { customerId, cartId } = req.query;
    let cart = await findAndMergeCart(customerId, cartId);

    // 3. If still nothing exists, create a brand new cart
    if (!cart) {
      const newCartId = `CART-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      cart = new Cart({
        cartId: newCartId,
        customerId: customerId || null,
        items: [],
        totalQuantity: 0,
        subtotal: 0
      });
      await cart.save();
    } else {
      await cart.populate('items.productId');
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addToCart = async (req, res) => {
  try {
    const { cartId, customerId, productId, quantity = 1 } = req.body;
    console.log(customerId)
    let cart = await findAndMergeCart(customerId, cartId);

    if (!cart) {
      const newCartId = `CART-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      cart = new Cart({ 
        cartId: newCartId, 
        customerId: customerId || null, 
        items: [] 
      });
    }

    if (customerId && !cart.customerId) {
      cart.customerId = customerId;
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += Number(quantity);
    } else {
      cart.items.push({ productId, quantity: Number(quantity), price: product.price });
    }

    calculateTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCartItem = async (req, res) => {
  try {
    const { cartId, customerId, productId, quantity } = req.body;
    const cart = await findAndMergeCart(customerId, cartId);
    
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) return res.status(404).json({ error: 'Item not found in cart' });

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = Number(quantity);
    }

    calculateTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removeCartItem = async (req, res) => {
  try {
    const { cartId, customerId, productId } = req.body;
    const cart = await findAndMergeCart(customerId, cartId);

    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    calculateTotals(cart);
    await cart.save();

    const updatedCart = await Cart.findById(cart._id).populate('items.productId');
    res.json(updatedCart);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};