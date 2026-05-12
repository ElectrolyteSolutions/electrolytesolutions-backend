const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  address: String,
  devices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Device' }],
  purchaseHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Billing' }]
}, { timestamps: true });

module.exports = mongoose.model('Customer', CustomerSchema);