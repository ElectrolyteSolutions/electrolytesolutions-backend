const Bill = require('../models/Bills');
const Customer = require('../models/Customers');
const Device = require('../models/Devices');
const Product = require('../models/Products');

exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('customer')
      .populate('device');

    if (!bill) {
      return res.status(404).json({ message: "Invoice registry record not found" });
    }
    res.status(200).json(bill);
  } catch (err) {
    res.status(500).json({ message: "Database lookup failure", error: err.message });
  }
};

exports.processReturnBill = async (req, res) => {
  try {
    const originalBillId = req.params.id;
    const { itemsToReturn } = req.body; // Expects array format: [{ productId, quantity }]

    // 1. Fetch original purchase manifest context
    const originalBill = await Bill.findById(originalBillId);
    if (!originalBill) {
      return res.status(404).json({ message: "Original transaction profile not found" });
    }

    let dynamicRefundSubtotal = 0;
    const itemsReturnedManifest = [];

    // 2. Map structural array data loops for validation & price matching
    for (let returnItem of itemsToReturn) {
      const originalItem = originalBill.items.find(
        item => item.productId.toString() === returnItem.productId
      );

      if (!originalItem) {
        return res.status(400).json({ 
          message: `Product matching ID ${returnItem.productId} was not part of original invoice.` 
        });
      }

      if (returnItem.quantity > originalItem.orderedQuantity) {
        return res.status(400).json({ 
          message: `Return quantity for '${originalItem.name}' cannot exceed original purchased quantity.` 
        });
      }

      // Calculate localized financial value variations
      const currentLineRefund = originalItem.price * returnItem.quantity;
      dynamicRefundSubtotal += currentLineRefund;

      itemsReturnedManifest.push({
        productId: originalItem.productId,
        name: originalItem.name,
        price: originalItem.price,
        orderedQuantity: returnItem.quantity, // Quantity being handed back to the shop
        subTotal: currentLineRefund
      });

      // 3. ⚡ INSTANT INVENTORY RESTOCK
      // Skip stock increments if item was an ad-hoc custom line item charge
      if (originalItem.productId && !originalItem.productId.toString().startsWith('CUSTOM-')) {
        await Product.findByIdAndUpdate(originalItem.productId, {
          $inc: { quantity: returnItem.quantity }
        });
      }
    }

    // 4. Instantiate a separate, immutable Return Bill Document
    const returnBill = new Bill({
      customer: originalBill.customer,
      purpose: 'return', // Explicitly marked as return manifest
      originalInvoiceId: originalBillId,
      items: itemsReturnedManifest,
      serviceCharge: 0, // Labor is non-refundable 
      totalAmount: dynamicRefundSubtotal
    });

    await returnBill.save();

    // 5. Populate and return fresh receipt structure straight back to your frontend
    const fullyPopulatedManifest = await Bill.findById(returnBill._id)
      .populate('customer');

    res.status(201).json(fullyPopulatedManifest);

  } catch (err) {
    res.status(500).json({ message: "Failed to compile return POS invoice", error: err.message });
  }
};

exports.createBill = async (req, res) => {
  try {
    const { customer, purpose, device, serviceCharge, items } = req.body;

    let computedTotal = 0;

    // 1. Validate Stock Levels and compute item subtotals
    for (let item of items) {
      if (item.isCustomLineItem) {
          item.productId = undefined; // Strips the lookup binding requirement
          item.subTotal = Number(item.price) * Number(item.orderedQuantity);
          computedTotal += item.subTotal;
          continue; // Skips downstream Product database checks for this loop iteration
        }

      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.name} not found` });
      }

      // Block sales if inventory is depleted (only for non-quotations)
      if (purpose !== 'quotation' && product.quantity < item.orderedQuantity) {
        return res.status(400).json({ message: `Insufficient stock for ${product.brand} ${product.modelName}` });
      }

      item.name = product.name;
      item.brand = product.brand;
      item.modelName = product.modelName;
      item.subTotal = item.price * item.orderedQuantity;
      computedTotal += item.subTotal;
    }

    if (purpose === 'repair') {
      computedTotal += Number(serviceCharge || 0);
    }

    // 2. Persist the Bill Data
    const newBill = new Bill({
      customer,
      purpose,
      device: purpose === 'repair' ? device : undefined,
      serviceCharge: purpose === 'repair' ? serviceCharge : 0,
      items,
      totalAmount: computedTotal,
      lastUpdated: new Date().toLocaleString()
    });

    const savedBill = await newBill.save();

    // 3. Update Customer's Bills Array Tracking
    await Customer.findByIdAndUpdate(customer, {
      $push: { bills: savedBill._id }
    });

    // 4. Update Device's Bills Array Tracking if applicable
    if (purpose === 'repair' && device) {
      await Device.findByIdAndUpdate(device, {
        $push: { bills: savedBill._id }
      });
    }

    // 5. Update Product Quantities (Skip execution if it's a quotation)
    if (purpose !== 'quotation') {
      for (let item of items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -item.orderedQuantity },
          $set: { lastUpdated: new Date().toLocaleString() }
        });
      }
    }

    res.status(201).json(savedBill);
  } catch (err) {
    res.status(400).json({ message: "Billing transaction failed", error: err.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('customer', 'name phone')
      .populate('device', 'deviceName deviceHardwareId')
      .sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill) return res.status(404).json({ message: "Invoice record not found" });

    // Clean up references
    await Customer.findByIdAndUpdate(bill.customer, { $pull: { bills: bill._id } });
    if (bill.device) {
      await Device.findByIdAndUpdate(bill.device, { $pull: { bills: bill._id } });
    }

    await Bill.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};