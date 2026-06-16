const express = require('express');
const router = express.Router();

const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  getAllUsers 
} = require('../controllers/userController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected Routes (Must be logged in)
router.get('/profile', protect, getUserProfile);

// Admin Only Route (Must be logged in AND be an admin)
router.get('/', protect, authorizeRoles('admin'), getAllUsers);

module.exports = router;