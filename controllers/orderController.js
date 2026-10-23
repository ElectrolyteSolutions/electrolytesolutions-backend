const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Orders');
const Cart = require('../models/Carts');
const Customer = require('../models/Customers');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to calculate shipping cost and delivery rules
const calculateShipping = (shippingAddress, subtotal) => {
  if (!shippingAddress) return { cost: 79, method: 'State Standard Shipping (UP)' };

  const zip = String(shippingAddress.zip || '').trim();
  const city = String(shippingAddress.city || '').toLowerCase().trim();
  const province = String(shippingAddress.province || '').toLowerCase().trim();

  let cost = 79;
  let method = 'State Standard Shipping (UP)';

  // Balrampur, UP, 271201 (Lightning Delivery)
  if (zip === '271201' || city.includes('balrampur')) {
    cost = 39;
    method = 'Lightning City Delivery (Balrampur - 29 mins)';
  } 
  // Within Uttar Pradesh
  else if (province.includes('uttar pradesh') || province === 'up') {
    cost = 79;
    method = 'State Standard Shipping (UP - 3-5 days)';
  } 
  // Outside UP (National)
  else {
    cost = 129;
    method = 'National Express Shipping (Outside UP - 5-9 days)';
  }

  // Free shipping relaxation above ₹2000 order amount
  if (subtotal > 2000) {
    cost = 0;
  }

  return { cost, method };
};

// Step 1: Initialize Razorpay Order (with dynamic shipping)
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { customerId, shippingAddress } = req.body;

    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const shippingInfo = calculateShipping(shippingAddress, cart.subtotal);
    const finalTotalAmount = cart.subtotal + shippingInfo.cost;
    const amountInPaise = Math.round(finalTotalAmount * 100);

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
      subtotal: cart.subtotal,
      shippingCost: shippingInfo.cost,
      shippingMethod: shippingInfo.method,
      totalAmount: finalTotalAmount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Step 2: Verify Signature & Save Online Order in Database
exports.verifyAndCreateOrder = async (req, res) => {
  try {
    const { 
      customerId, 
      shippingAddress, 
      shippingCost,
      shippingMethod,
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature 
    } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const cart = await Cart.findOne({ customerId });
    if (!cart) return res.status(404).json({ error: 'Cart not found' });

    const shippingInfo = shippingCost !== undefined ? { cost: shippingCost, method: shippingMethod } : calculateShipping(shippingAddress, cart.subtotal);
    const finalTotalAmount = cart.subtotal + shippingInfo.cost;
    const orderNumber = `ES-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      customerId,
      orderNumber,
      items: cart.items,
      subtotal: cart.subtotal,
      shippingCost: shippingInfo.cost,
      shippingMethod: shippingInfo.method,
      totalAmount: finalTotalAmount,
      shippingAddress,
      financialStatus: 'Paid',
      fulfillmentStatus: 'Unfulfilled',
      paymentInfo: {
        method: 'Online',
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        status: 'Paid'
      }
    });

    await newOrder.save();

    await Customer.findByIdAndUpdate(customerId, {
      $push: { orders: newOrder._id }
    });

    cart.items = [];
    cart.totalQuantity = 0;
    cart.subtotal = 0;
    await cart.save();

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Step 3: Create Cash on Delivery (COD) Order
exports.createCodOrder = async (req, res) => {
  try {
    const { customerId, shippingAddress } = req.body;

    const cart = await Cart.findOne({ customerId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const shippingInfo = calculateShipping(shippingAddress, cart.subtotal);
    const finalTotalAmount = cart.subtotal + shippingInfo.cost;
    const orderNumber = `ES-COD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      customerId,
      orderNumber,
      items: cart.items,
      subtotal: cart.subtotal,
      shippingCost: shippingInfo.cost,
      shippingMethod: shippingInfo.method,
      totalAmount: finalTotalAmount,
      shippingAddress,
      financialStatus: 'Pending',
      fulfillmentStatus: 'Unfulfilled',
      paymentInfo: {
        method: 'COD',
        status: 'Pending'
      }
    });

    await newOrder.save();

    await Customer.findByIdAndUpdate(customerId, {
      $push: { orders: newOrder._id }
    });

    cart.items = [];
    cart.totalQuantity = 0;
    cart.subtotal = 0;
    await cart.save();

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ERP Dashboard: Get All Orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customerId')
      .populate('items.productId')
      .sort({ createdAt: -1 });

    // Map customerId property to customer alias for frontend ERP table support
    const formattedOrders = orders.map(ord => {
      const obj = ord.toObject();
      obj.customer = obj.customerId;
      return obj;
    });

    res.status(200).json(formattedOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ERP Dashboard: Update Order Status (Fulfillment / Financial)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await Order.findByIdAndUpdate(
      id, 
      { ...req.body }, 
      { new: true }
    )
      .populate('customerId')
      .populate('items.productId');

    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const obj = updatedOrder.toObject();
    obj.customer = obj.customerId;

    res.status(200).json(obj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ERP Dashboard: Delete Order
exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await Order.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};