const Product = require('../models/Products');

// Using async/await with try-catch for clean error handling
exports.getProducts = async (req, res) => {
  try {
    const { alert } = req.query;
    let filterCondition = {};

    // If '?alert=low-stock' parameter is attached to the request URL
    if (alert === 'low-stock') {
      filterCondition.quantity = { $lte: 0 };
    }

    const products = await Product.find(filterCondition).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
};


exports.createProduct = async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: "Validation error", error: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, lastUpdated: new Date().toLocaleString() }, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Update failed", error: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};