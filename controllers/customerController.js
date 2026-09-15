const Customer = require('../models/Customers');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

exports.registerCustomer = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    const existingUser = await Customer.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const customer = await Customer.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      authProvider: 'local'
    });

    const token = jwt.sign({ id: customer._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
