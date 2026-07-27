const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const parser = require('ua-parser-js');
const User = require('../models/User');

// Helper function to generate JWT including sessionId
const generateToken = (id, role, sessionId) => {
  return jwt.sign({ id, role, sessionId }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  });
};

// @desc    Authenticate a user & get token
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide an email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const sessionId = uuidv4();
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || 'Unknown IP';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    // Optional limit: keep max 3 sessions (FIFO)
    if (user.sessions.length >= 3) {
      user.sessions.shift();
    }

    user.sessions.push({
      sessionId,
      ipAddress,
      userAgent,
      loginAt: new Date()
    });

    await user.save();

    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role, sessionId)
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// @desc    Get active sessions (where and when)
// @route   GET /api/users/sessions
// @access  Private
exports.getActiveSessions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const sessions = user.sessions.map(session => {
      const parsedAgent = parser(session.userAgent);
      return {
        sessionId: session.sessionId,
        ipAddress: session.ipAddress,
        device: `${parsedAgent.os.name || 'Unknown OS'} - ${parsedAgent.browser.name || 'Unknown Browser'}`,
        loginAt: session.loginAt,
        isCurrent: session.sessionId === req.user.sessionId
      };
    });

    res.status(200).json({
      count: sessions.length,
      activeSessions: sessions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching sessions', error: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public / Admin
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const sessionId = uuidv4();
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'customer',
      sessions: [{
        sessionId,
        ipAddress: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.headers['user-agent']
      }]
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role, sessionId)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// @desc    Get current logged in user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin Only
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({});
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  try {
    // ⚡ Find strictly by req.user._id (from auth middleware)
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update fields in-place
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone !== undefined ? req.body.phone : user.phone;
    user.address = req.body.address !== undefined ? req.body.address : user.address;

    if (req.body.password) {
      user.password = req.body.password; // Triggers pre-save hash hook safely
    }

    const updatedUser = await user.save(); // Preserves original _id

    res.status(200).json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Server error during profile update', error: error.message });
  }
};