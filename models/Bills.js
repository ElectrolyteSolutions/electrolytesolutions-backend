const mongoose = require('mongoose');

const billItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product'},
  name: { type: String, required: true },
  price: { type: Number, required: true },
  baseRate:{type:Number,required:false,default:0},
  discount: { type: Number, default: 0 }, // ⚡ NEW: Stores item discount value in Rupees (Rs.)
  orderedQuantity: { type: Number, required: true },
  subTotal: { type: Number, required: true },
  isCustomLineItem: { type: Boolean, default: false },

});

const billSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  purpose: { type: String, enum: ['purchase', 'repair', 'quotation','return'], required: true },
  
  // Conditionally used if purpose is 'repair'
  device: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: false,default:null },
  serviceCharge: { type: Number, default: 0 },

  items: [billItemSchema],
  totalAmount: { type: Number, required: true },
  lastUpdated: { type: String, default: () => new Date().toLocaleString() },
  isPaid : { type:Boolean , default:true},
  originalInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bill',
    default: null // ⚡ Links a return receipt back to its source purchase
  }

}, { timestamps: true });

module.exports = mongoose.model('Bill', billSchema);