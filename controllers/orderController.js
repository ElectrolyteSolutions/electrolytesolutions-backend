const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Orders');
const Cart = require('../models/Carts');
const Customer = require('../models/Customers');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Step 1: Initialize Razorpay Order
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { customerId, shippingAddress } = req.body;

    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const amountInPaise = Math.round(cart.subtotal * 100); // Razorpay expects amount in smallest currency unit (paise)

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_ord_${Date.now()}`
    };

    const razorpayOrder = await razorpay.orders.create(options);

    res.status(200).json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      subtotal: cart.subtotal
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Step 2: Verify Signature & Save Order in ERP Database
exports.verifyAndCreateOrder = async (req, res) => {
  try {
    const { 
      customerId, 
      shippingAddress, 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature 
    } = req.body;

    // Cryptographic signature verification
    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch user cart
    const cart = await Cart.findOne({ customerId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const orderNumber = `ES-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      customerId,
      orderNumber,
      items: cart.items,
      totalAmount: cart.subtotal,
      shippingAddress,
      paymentInfo: {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        status: 'Paid'
      }
    });

    await newOrder.save();

    // Push order into Customer's orders list (if tracking via array reference)
    await Customer.findByIdAndUpdate(customerId, {
      $push: { orders: newOrder._id }
    });

    // Clear cart after successful order
    cart.items = [];
    cart.totalQuantity = 0;
    cart.subtotal = 0;
    await cart.save();

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};