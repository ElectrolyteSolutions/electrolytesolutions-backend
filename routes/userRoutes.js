const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  getAllUsers,
  getActiveSessions,
  updateUserProfile ,
  logoutAllDevices,
  terminateSession
} = require('../controllers/userController');

const { protect, authorizeRoles } = require('../middleware/authMiddleware');

// ⚡ Public Routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// ⚡ Protected Routes (Must be logged in)
// Note: Put specific sub-routes like /profile and /sessions BEFORE any generic parameters
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile); // <--- Added route for updating profile
router.get('/sessions', protect, getActiveSessions);

// ⚡ Admin Only Route (Must be logged in AND be an admin)
router.get('/', protect, authorizeRoles('admin'), getAllUsers);
router.post('/logout-all', protect, logoutAllDevices);
// Add inside your protected routes
router.delete('/sessions/:sessionId', protect, terminateSession);
module.exports = router;