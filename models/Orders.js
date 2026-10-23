const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  orderNumber: { type: String, required: true, unique: true },
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
  }],
  totalAmount: { type: Number, required: true },
  shippingAddress: {
    address1: String,
    address2: String,
    city: String,
    province: String,
    country: String,
    zip: String
  },
  paymentInfo: {
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    status: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' }
  },
  financialStatus: { type: String, default: 'Paid' },
  fulfillmentStatus: { type: String, default: 'Unfulfilled' }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);