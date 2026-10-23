const Customer = require('../models/Customers');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


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
  console.log("Update request received for customer ID:", req.params.id);
  console.log("Request body:", req.body);
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


exports.updateProfile = async (req, res) => {
  // Fallback to req.user.id from auth middleware if req.params.id isn't provided
  const customerId = req.params.id || req.user?.id;

  console.log("Update request received for customer ID:", customerId);
  console.log("Request body:", req.body);

  try {
    // Prevent updating sensitive fields like password or email directly through this route unless intended
    const { firstName, lastName, phone, address, addresses, customerType, gst, pan } = req.body;
    
    const updateData = {
      ...(firstName && { firstName }),
      ...(lastName && { lastName }),
      ...(phone && { phone }),
      ...(address && { address }),
      ...(addresses && { addresses }),
      ...(customerType && { customerType }),
      ...(gst !== undefined && { gst }),
      ...(pan !== undefined && { pan }),
      lastUpdated: new Date().toLocaleString()
    };

    const updated = await Customer.findByIdAndUpdate(
      customerId, 
      updateData, 
      { new: true, runValidators: true }
    ).select('-password'); // Exclude password from the returned object

    if (!updated) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      customer: updated
    });
  } catch (err) {
    console.error("Error updating customer profile:", err.message);
    res.status(400).json({ message: "Failed to update profile", error: err.message });
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

exports.registerCustomer = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Log incoming request body for debugging
    console.log("Registration attempt received for:", email);

    const existingUser = await Customer.findOne({ email });
    if (existingUser) {
      console.warn("Registration failed: Email already registered ->", email);
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const customer = new Customer({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      authProvider: 'local'
    });

    await customer.save();
    console.log("Customer successfully registered and saved to MongoDB:", customer._id);

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({ token, customer });
  } catch (err) {
    // Detailed error logging in backend console
    console.error("CRITICAL ERROR in registerCustomer:", err.message);
    console.error(err.stack);
    
    res.status(500).json({ error: err.message || 'Internal server error during registration' });
  }
};

exports.loginCustomer = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });
    if (!customer || !customer.password) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.googleOAuth = async (req, res) => {
  try {
    const { idToken } = req.body;
    const ticket = await client.verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const { email, given_name, family_name, sub: googleId } = ticket.getPayload();

    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = await Customer.create({
        email,
        firstName: given_name || 'Google',
        lastName: family_name || 'User',
        googleId,
        authProvider: 'google'
      });
    } else if (!customer.googleId) {
      customer.googleId = googleId;
      await customer.save();
    }

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    // req.user.id comes from the verifyToken middleware above
    const user = await Customer.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
// Add a new address to customer's addresses array
exports.addAddress = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    customer.addresses.push(req.body);
    await customer.save();

    res.status(200).json({ success: true, message: "Address added successfully", customer });
  } catch (err) {
    res.status(400).json({ message: "Failed to add address", error: err.message });
  }
};

// Update an existing address by its sub-document ID
exports.updateAddress = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const addressId = req.params.addressId;

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    const addressItem = customer.addresses.id(addressId);
    if (!addressItem) return res.status(404).json({ message: "Address not found" });

    // Update fields
    Object.assign(addressItem, req.body);
    await customer.save();

    res.status(200).json({ success: true, message: "Address updated successfully", customer });
  } catch (err) {
    res.status(400).json({ message: "Failed to update address", error: err.message });
  }
};

// Delete an address by its sub-document ID
exports.deleteAddress = async (req, res) => {
  try {
    const customerId = req.user?.id;
    const addressId = req.params.addressId;

    const customer = await Customer.findById(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    customer.addresses.id(addressId).deleteOne();
    await customer.save();

    res.status(200).json({ success: true, message: "Address deleted successfully", customer });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete address", error: err.message });
  }
};