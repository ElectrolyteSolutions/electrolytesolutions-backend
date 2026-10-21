const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
  cartId: { type: String, required: true, unique: true },
  customerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: false, 
    default: null 
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true, default: 1 },
      price: { type: Number, required: true }
    }
  ],
  totalQuantity: { type: Number, default: 0 },
  subtotal: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);