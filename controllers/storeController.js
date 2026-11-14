const StoreInfo = require('../models/StoreInfo');

// Get Store Policies & Info
exports.getStoreInfo = async (req, res) => {
  try {
    // Return the single store document (create one if it doesn't exist yet)
    let storeInfo = await StoreInfo.findOne();
    if (!storeInfo) {
      storeInfo = await StoreInfo.create({});
    }
    res.status(200).json(storeInfo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update Store Policies & Info (Admin only)
exports.updateStoreInfo = async (req, res) => {
  try {
    let storeInfo = await StoreInfo.findOne();
    if (!storeInfo) {
      storeInfo = new StoreInfo(req.body);
    } else {
      Object.assign(storeInfo, req.body);
    }
    await storeInfo.save();
    res.status(200).json({ message: 'Store information updated successfully', storeInfo });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};