const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  lineItems: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantSku: String,
    quantity: Number,
    price: Number
  }],
  pricing: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number
  },
  shippingAddress: Object,
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  fulfillmentStatus: { type: String, enum: ['unfulfilled', 'fulfilled', 'cancelled'], default: 'unfulfilled' },
  erpOrderId: { type: String } // Reference ID returned by your ERP upon successful sync
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
