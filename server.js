const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Customer = require('./models/Customer');
const Product = require('./models/Product');
const Device = require('./models/Device');
const Billing = require('./models/Billing');

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. PRODUCT & INVENTORY ACTIONS ---

// Get All Products (Stock Management)
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

// Add/Update Stock
app.post('/api/products', async (req, res) => {
  const newProduct = new Product(req.body);
  await newProduct.save();
  res.json(newProduct);
});

// --- 2. CUSTOMER & DEVICE ACTIONS ---

// Create Customer with Device
app.post('/api/customers', async (req, res) => {
  try {
    const { name, phone, address, deviceData } = req.body;
    
    // 1. Create Customer
    let customer = await Customer.findOne({ phone });
    if (!customer) {
      customer = new Customer({ name, phone, address });
      await customer.save();
    }

    // 2. If Device info exists, link it
    if (deviceData) {
      const device = new Device({ ...deviceData, owner: customer._id });
      await device.save();
      customer.devices.push(device._id);
      await customer.save();
    }

    res.json(customer);
  } catch (err) { res.status(500).send(err.message); }
});

// --- 3. ROBUST BILLING ACTIONS (With Auto-Stock Deduction) ---

app.post('/api/billing', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      customerId, 
      deviceId, // Only if serviceType is 'repairing'
      items, 
      grandTotal, 
      paymentStatus, // 'Paid' or 'Pending'
      serviceType // 'repairing' or 'purchase'
    } = req.body;

    const invoiceNo = `ES-${Date.now().toString().slice(-6)}`;

    // 1. Create the Bill record
    const bill = new Billing({
      invoiceNo,
      customer: customerId,
      device: serviceType === 'repairing' ? deviceId : null,
      items,
      grandTotal,
      status: paymentStatus
    });
    await bill.save({ session });

    // 2. Update Inventory & Check Stock
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);
      
      if (product) {
        // Deduct stock
        product.stock -= item.qty;
        
        // Safety check: prevent negative stock if you want strict control
        if (product.stock < 0) {
            // Option: Allow negative stock but flag for order, 
            // or throw error to stop sale. 
            // We'll allow it so you can complete the sale, but it triggers 'Orders'
        }
        await product.save({ session });
      }
    }

    // 3. Update Customer History
    await Customer.findByIdAndUpdate(customerId, { 
      $push: { purchaseHistory: bill._id } 
    }).session(session);

    await session.commitTransaction();
    res.json({ success: true, invoiceNo, bill });
  } catch (err) {
    await session.abortTransaction();
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

// --- 4. ANALYTICS & ALERTS ---

// Get Low Stock Products
app.get('/api/inventory/alerts', async (req, res) => {
  const lowStock = await Product.find({ $expr: { $lte: ["$stock", "$minStockAlert"] } });
  res.json(lowStock);
});

mongoose.connect('mongodb://localhost:27017/electrolyte_erp');
app.listen(5000, () => console.log("ERP Backend Active on Port 5000"));