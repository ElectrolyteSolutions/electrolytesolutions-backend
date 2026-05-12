const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true }, // Stock Keeping Unit
  category: { type: String, enum: ['Battery', 'Inverter', 'Solar Panel', 'Service', 'Spare'] },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
  minStockAlert: { type: Number, default: 5 } // For "Auto-Order" logic
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);