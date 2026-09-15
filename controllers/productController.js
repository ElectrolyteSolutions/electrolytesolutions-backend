const Product = require('../models/Products');
const Collection = require('../models/Collections');

// Using async/await with try-catch for clean error handling
exports.getProducts = async (req, res) => {
  try {
    const { alert, search, sortBy, sortOrder, brand, modelName } = req.query;
    let filterCondition = {};

    // 1. Existing Alert Filter Configuration
    if (alert === 'low-stock') {
      filterCondition.quantity = { $lte: 0 };
    }

    // 2. Fuzzy Text Search Mapping (Matches product name case-insensitively)
    if (search && search.trim() !== '') {
      filterCondition.name = { $regex: search.trim(), $options: 'i' };
    }

    // 3. Dynamic Structural Attribute Filters
    if (brand && brand.trim() !== '') {
      filterCondition.brand = { $regex: brand.trim(), $options: 'i' };
    }
    
    if (modelName && modelName.trim() !== '') {
      filterCondition.modelName = { $regex: modelName.trim(), $options: 'i' };
    }

    // 4. Multi-Criteria Sorting Engine Dictionary Mapping Matrix
    let sortExecutionObject = { createdAt: -1 }; // Default fallback orientation configuration key

    if (sortBy) {
      // Maps client shorthand keys directly to backend DB collection field tokens
      let targetSortField = sortBy;
      if (sortBy === 'qty') targetSortField = 'quantity';
      if (sortBy === 'price') targetSortField = 'price';
      if (sortBy === 'name') targetSortField = 'name';

      // Evaluate asc/desc values (Defaulting to ascending 1 if parameters drop)
      const executionDirection = sortOrder === 'desc' ? -1 : 1;
      sortExecutionObject = { [targetSortField]: executionDirection };
    }

    // Execute aggregated Mongo queries matrix pipelines
    const products = await Product.find(filterCondition).sort(sortExecutionObject);
    
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch filtered products matrix", error: err.message });
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

exports.getCollections = async (req, res) => {
  try {
    const collections = await Collection.find();
    res.json(collections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProductslist = async (req, res) => {
  try {
    const { collectionId, search, page = 1, limit = 20 } = req.query;
    let query = { status: 'active' };

    if (collectionId) query.collections = collectionId;
    if (search) query.$text = { $search: search };

    const products = await Product.find(query)
      .populate('collections')
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug }).populate('collections');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};