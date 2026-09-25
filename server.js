const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db'); // Import the connection helper

const app = express();

const androidRoutes = require('./routes/androidRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const billingRoutes = require('./routes/billingRoutes');
const userRoutes = require('./routes/userRoutes');

// Middleware
app.use(cors());
app.use(express.json());

// 🔌 Global Database Middleware: Ensures DB is connected on every request
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ Database Connection Error:', err);
    return res.status(500).json({ 
      message: 'Server error during database connection', 
      error: err.message 
    });
  }
});

// Routes
app.use('/products', productRoutes);
app.use('/customers', customerRoutes);
app.use('/devices', deviceRoutes);
app.use('/billings', billingRoutes);
app.use('/users', userRoutes);
app.use('/android', androidRoutes);

// Local development server listener
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
}

// Export app for Vercel serverless deployment
module.exports = app;