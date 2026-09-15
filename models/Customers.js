const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // Optional if using Google OAuth exclusively
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    googleId: { type: String, unique: true, sparse: true },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    addresses: [{
      address1: String,
      address2: String,
      city: String,
      province: String,
      country: String,
      zip: String,
      isDefault: Boolean
    }],
    phone: { type: String },
    name: { type: String, required: true },
    phone: { type: String, required: true },
    customerType: { type: String, enum: ['Individual', 'Corporate'], default: 'Individual' },
    address: { type: String, required: true },
    devices: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Device' 
    }],
    lastUpdated: { type: String, default: () => new Date().toLocaleString() }
  }, 
  { timestamps: true }
);

module.exports = mongoose.model('Customer', customerSchema);