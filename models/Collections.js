const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
  erpCollectionId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  image: String,
  seo: {
    metaTitle: String,
    metaDescription: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Collection', collectionSchema);