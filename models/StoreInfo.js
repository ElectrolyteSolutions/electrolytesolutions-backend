const mongoose = require('mongoose');

const storeInfoSchema = new mongoose.Schema({
  termsOfService: { type: String, default: '' },
  privacyPolicy: { type: String, default: '' },
  shippingPolicy: { type: String, default: '' },
  refundPolicy: { type: String, default: '' },
  contactInfo: {
    gst: { type: String, default: '' },
    phones: [{ type: String }], // Array for multiple phone numbers
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    address: { type: String, default: '' }
  }
}, { timestamps: true });

module.exports = mongoose.model('StoreInfo', storeInfoSchema);