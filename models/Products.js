const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  erpProductId: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  collections: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Collection', index: true }],
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
  type: { type: String, required: true, index: true },
  brand: { type: String, index: true },
  status: { type: String, enum: ['active', 'draft', 'archived'], default: 'active', index: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  orignalPrice: { type: Number },
  quantity: { type: Number, required: true },
  baseRate: { type: Number, required: true },
  hsn: { type: Number, required: false },
  lastUpdated: { type: String, default: () => new Date().toLocaleString() }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);