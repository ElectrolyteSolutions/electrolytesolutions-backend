const cartSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', sparse: true },
  sessionId: { type: String }, // For guest carts
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);