const Collection = require('../models/Collections'); // Adjust path to your model if needed

// @desc    Create a new collection
// @route   POST /api/collections
// @access  Public (or Protected)
exports.createCollection = async (req, res) => {
  try {
    const { erpCollectionId, title, slug, image, seo } = req.body;

    // Check if collection already exists by erpCollectionId or slug
    const existing = await Collection.findOne({ $or: [{ erpCollectionId }, { slug }] });
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        message: 'Collection with this erpCollectionId or slug already exists.' 
      });
    }

    const newCollection = await Collection.create({
      erpCollectionId,
      title,
      slug,
      image,
      seo
    });

    res.status(201).json({
      success: true,
      data: newCollection
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all collections
// @route   GET /api/collections
// @access  Public
exports.getAllCollections = async (req, res) => {
  try {
    const collections = await Collection.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: collections.length,
      data: collections
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single collection by ID
// @route   GET /api/collections/:id
// @access  Public
exports.getCollectionById = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    res.status(200).json({
      success: true,
      data: collection
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update collection by ID
// @route   PUT /api/collections/:id
// @access  Public (or Protected)
exports.updateCollection = async (req, res) => {
  try {
    const updatedCollection = await Collection.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedCollection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    res.status(200).json({
      success: true,
      data: updatedCollection
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete collection by ID
// @route   GET or DELETE /api/collections/:id
// @access  Public (or Protected)
exports.deleteCollection = async (req, res) => {
  try {
    const deletedCollection = await Collection.findByIdAndDelete(req.params.id);

    if (!deletedCollection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Collection deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
