const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  customerType: { type: String, enum: ['Individual', 'Corporate'], default: 'Individual' },
  address: { type: String, required: true },
  devices: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Device' 
  }],
  lastUpdated: { type: String, default: () => new Date().toLocaleString() }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);