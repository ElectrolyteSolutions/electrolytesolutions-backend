const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const androidRoutes = require('./routes/androidRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const billingRoutes = require('./routes/billingRoutes')
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes')

// Mount routess
// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/products', productRoutes);
app.use('/customers', customerRoutes);
app.use('/devices', deviceRoutes);
app.use('/billings', billingRoutes);
app.use('/users', userRoutes);
app.use('/android', androidRoutes);
// app.use('/carts', cartRoutes);
// app.use('/orders', orderRoutes);
// app.use('/collections', collectionRoutes);

// Database Connection (Swap with your MongoDBf URId)
const DB_URI = process.env.MONGO_URI ;

mongoose.connect(DB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ Connection Error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));