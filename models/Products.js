const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  baseRate:{ type: Number, required: true },
  hsn:{type:Number,required:false},
  lastUpdated: { type: String, default: () => new Date().toLocaleString() }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);