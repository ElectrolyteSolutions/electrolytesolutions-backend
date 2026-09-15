const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  erpProductId: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection' }],
  variants: [{
    erpVariantId: { type: String, required: true },
    sku: { type: String, required: true },
    price: { type: Number, required: true },
    compareAtPrice: { type: Number },
    inventoryQuantity: { type: Number, default: 0 },
    attributes: Map // Size, Color, etc.
  }],
  images: [String],
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active' },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  baseRate:{ type: Number, required: true },
  lastUpdated: { type: String, default: () => new Date().toLocaleString() }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
