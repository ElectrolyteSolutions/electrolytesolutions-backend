const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Orders');
const Cart = require('../models/Carts');
const Customer = require('../models/Customers');
const Product = require('../models/Products'); // Ensure Product model is imported

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

  if (zip === '271201' || city.includes('balrampur')) {
    cost = 0;
    method = 'Lightning City Delivery (Balrampur - 29 mins)';
  } else if (province.includes('uttar pradesh') || province === 'up') {
    cost = 79;
    method = 'State Standard Shipping (UP - 3-5 days)';
  } else {
    cost = 129;
    method = 'National Express Shipping (Outside UP - 5-9 days)';
  }

  if (subtotal > 2000) {
    cost = 0;
  }

  return { cost, method };
};

// Helper to resolve order items & subtotal whether Direct Buy or Cart
const resolveOrderItemsAndSubtotal = async (body) => {
  let orderItems = [];
  let subtotal = 0;

  if (body.productId && body.quantity) {
    // Direct Buy payload
    const product = await Product.findById(body.productId);
    if (!product) throw new Error('Direct buy product not found');
    
    const itemPrice = product.price || 0;
    orderItems = [{
      productId: product._id,
      quantity: Number(body.quantity),
      price: itemPrice
    }];
    subtotal = itemPrice * Number(body.quantity);
  } else {
    // Cart payload fallback
    const cart = await Cart.findOne({ customerId: body.customerId }).populate('items.productId');
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new Error('Cart is empty and no direct product specified');
    }
    orderItems = cart.items.map(item => ({
      productId: item.productId._id || item.productId,
      quantity: item.quantity,
      price: item.productId.price || item.price
    }));
    subtotal = cart.subtotal;
  }

  return { orderItems, subtotal };
};

// Step 1: Initialize Razorpay Order (supports Direct Buy & Cart)
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { customerId, shippingAddress, productId, quantity } = req.body;

    const { orderItems, subtotal } = await resolveOrderItemsAndSubtotal({ customerId, productId, quantity });
    const shippingInfo = calculateShipping(shippingAddress, subtotal);
    const finalTotalAmount = subtotal + shippingInfo.cost;
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
      subtotal,
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
      razorpaySignature,
      productId,
      quantity
    } = req.body;

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const { orderItems, subtotal } = await resolveOrderItemsAndSubtotal({ customerId, productId, quantity });
    const shippingInfo = shippingCost !== undefined ? { cost: shippingCost, method: shippingMethod } : calculateShipping(shippingAddress, subtotal);
    const finalTotalAmount = subtotal + shippingInfo.cost;
    const orderNumber = `ES-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      customerId,
      orderNumber,
      items: orderItems,
      subtotal,
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

    // Clear cart ONLY if it was a cart checkout (not direct buy)
    if (!productId) {
      const cart = await Cart.findOne({ customerId });
      if (cart) {
        cart.items = [];
        cart.totalQuantity = 0;
        cart.subtotal = 0;
        await cart.save();
      }
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Step 3: Create Cash on Delivery (COD) Order (supports Direct Buy & Cart)
exports.createCodOrder = async (req, res) => {
  try {
    const { customerId, shippingAddress, productId, quantity } = req.body;

    const { orderItems, subtotal } = await resolveOrderItemsAndSubtotal({ customerId, productId, quantity });
    const shippingInfo = calculateShipping(shippingAddress, subtotal);
    const finalTotalAmount = subtotal + shippingInfo.cost;
    const orderNumber = `ES-COD-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder = new Order({
      customerId,
      orderNumber,
      items: orderItems,
      subtotal,
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

    // Clear cart ONLY if it was a cart checkout
    if (!productId) {
      const cart = await Cart.findOne({ customerId });
      if (cart) {
        cart.items = [];
        cart.totalQuantity = 0;
        cart.subtotal = 0;
        await cart.save();
      }
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ERP Dashboard methods remain unchanged...
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('customerId').populate('items.productId').sort({ createdAt: -1 });
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

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await Order.findByIdAndUpdate(id, { ...req.body }, { new: true }).populate('customerId').populate('items.productId');
    if (!updatedOrder) return res.status(404).json({ error: 'Order not found' });
    const obj = updatedOrder.toObject();
    obj.customer = obj.customerId;
    res.status(200).json(obj);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



exports.cancelOrder = async (req, res) => {
  console.log("REQUEST RECIVED")
  
  try {
    const { id } = req.params;
    const customerId = req.user.id; // Extracted from your protect middleware

    const order = await Order.findOne({ _id: id, customerId });
    if (!order) {
      return res.status(404).json({ error: 'Order not found or unauthorized' });
    }

    // Optional check: Prevent cancelling if already delivered or dispatched
    if (['dispatched', 'delivered', 'cancelled'].includes(order.fulfillmentStatus?.toLowerCase())) {
      return res.status(400).json({ error: `Cannot cancel an order that is already ${order.fulfillmentStatus}` });
    }

    order.fulfillmentStatus = 'cancelled';
    const updatedOrder = await order.save();
    
    // Populate details to match your response format
    const populatedOrder = await Order.findById(updatedOrder._id)
      .populate('customerId')
      .populate('items.productId');

    const obj = populatedOrder.toObject();
    obj.customer = obj.customerId;

    res.status(200).json({ message: 'Order cancelled successfully', order: obj });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;
    await Order.findByIdAndDelete(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};