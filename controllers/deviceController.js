const Device = require('../models/Devices');
const Customer = require('../models/Customers');

// CREATE: Register device and link to Customer
exports.createDevice = async (req, res) => {
  try {
    const newDevice = new Device(req.body);
    const savedDevice = await newDevice.save();

    // Push device ID into Customer's devices array
    await Customer.findByIdAndUpdate(req.body.owner, {
      $push: { devices: savedDevice._id }
    });

    res.status(201).json(savedDevice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// READ: Get all devices (populated with owner name)
exports.getDevices = async (req, res) => {
  try {
    // .populate('owner', 'name') helps the frontend show the owner name without a second API call
    const devices = await Device.find().populate('owner', 'name').sort({ createdAt: -1 });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ: Get devices for a specific customer
exports.getDevicesByCustomer = async (req, res) => {
  try {
    const devices = await Device.find({ owner: req.params.customerId });
    res.json(devices);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE: Update repair status or hardware details
exports.updateDevice = async (req, res) => {
  try {
    const updatedDevice = await Device.findByIdAndUpdate(
      req.params.id,
      { ...req.body, lastUpdated: new Date().toLocaleString() },
      { new: true }
    );
    res.json(updatedDevice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// DELETE: Remove device and pull reference from Customer
exports.deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) return res.status(404).json({ message: "Device not found" });

    // Remove the device ID from the Customer's array before deleting the device
    await Customer.findByIdAndUpdate(device.owner, {
      $pull: { devices: device._id }
    });

    await Device.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};