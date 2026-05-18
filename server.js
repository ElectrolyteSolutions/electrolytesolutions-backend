const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const billingRoutes = require('./routes/billingRoutes')
// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/billings', billingRoutes);

// Database Connection (Swap with your MongoDB URI)
const DB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/inventory';

mongoose.connect(DB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ Connection Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));