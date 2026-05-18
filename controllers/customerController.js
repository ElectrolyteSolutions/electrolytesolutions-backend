const Customer = require('../models/Customers');

exports.getCustomers = async (req, res) => {
  try {
    // .populate('devices') replaces the IDs in the devices array with actual device data
    const customers = await Customer.find()
      .populate('devices') 
      .sort({ createdAt: -1 });

    res.status(200).json(customers);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving customers", error: err.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    await newCustomer.save();
    res.status(201).json(newCustomer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const updated = await Customer.findByIdAndUpdate(
      req.params.id, 
      { ...req.body, lastUpdated: new Date().toLocaleString() }, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    await Customer.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};