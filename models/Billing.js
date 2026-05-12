const mongoose = require('mongoose');

const BillingSchema = new mongoose.Schema({
  invoiceNo: { type: String, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device' }, // Optional for non-repairs
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    qty: Number,
    price: Number,
    total: Number
  }],
  grandTotal: { type: Number, required: true },
  status: { type: String, enum: ['Paid', 'Pending'], default: 'Paid' }
}, { timestamps: true });

module.exports = mongoose.model('Billing', BillingSchema);