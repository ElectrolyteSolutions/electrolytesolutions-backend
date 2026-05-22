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
    const { customer, purpose, device, serviceCharge, items,isPaid } = req.body;

    let computedTotal = 0;

    // 1. Validate Stock Levels and compute item subtotals
    for (let item of items) {
      if (item.isCustomLineItem) {
        item.productId = undefined; // Strips the lookup binding requirement
        item.subTotal = (Number(item.price) - Number(item.discount || 0)) * Number(item.orderedQuantity)
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
      item.subTotal = (Number(item.price) - Number(item.discount || 0)) * Number(item.orderedQuantity);
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
      isPaid,
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

// ⚡ NEW API: Handles structural updates & stock tracking logic for editing/appending items inside existing bills
exports.updateBill = async (req, res) => {
  try {
    const { items, serviceCharge,isPaid } = req.body;
    const billId = req.params.id;

    // 1. Fetch targeted historical invoice document
    const oldBill = await Bill.findById(billId);
    if (!oldBill) {
      return res.status(404).json({ message: "Invoice registry record not found" });
    }

    let computedTotal = 0;
    const finalizedProcessedItems = [];

    // 2. Loop through incoming manifest row objects to evaluate delta stock reductions
    for (let item of items) {
      if (item.isCustomLineItem) {
        // Handle virtual unstructured custom entries cleanly
        const customSubTotal = (Number(item.price) - Number(item.discount || 0)) * Number(item.orderedQuantity);
        computedTotal += customSubTotal;
        finalizedProcessedItems.push({
          name: item.name,
          price: Number(item.price),
          discount: Number(item.discount || 0),
          orderedQuantity: Number(item.orderedQuantity),
          subTotal: customSubTotal,
          isCustomLineItem: true
        });
        continue;
      }

      // If it's an inventory catalog item, populate details from DB
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Inventory product '${item.name}' not found` });
      }

      // 3. ⚡ DYNAMIC STOCK ALLOCATION CHECK
      // If flag indicates a newly appended element line, evaluate current physical storage depth limits
      if (item.isNewAppendItem && oldBill.purpose !== 'quotation') {
        if (product.quantity < item.orderedQuantity) {
          return res.status(400).json({ 
            message: `Insufficient stock on store shelves to add ${product.brand} ${product.modelName}. Available: ${product.quantity}` 
          });
        }
        
        // Instantly deduct newly appended quantities from database inventory levels
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: -Number(item.orderedQuantity) },
          $set: { lastUpdated: new Date().toLocaleString() }
        });
      }

      // Process and compile standard schema item objects
      const itemSubTotal = (Number(item.price) - Number(item.discount || 0)) * Number(item.orderedQuantity);
      computedTotal += itemSubTotal;

      finalizedProcessedItems.push({
        productId: item.productId,
        name: product.name,
        brand: product.brand,
        modelName: product.modelName,
        price: Number(item.price),
        discount: Number(item.discount || 0),
        orderedQuantity: Number(item.orderedQuantity),
        subTotal: itemSubTotal,
        isCustomLineItem: false
      });
    }

    // 4. Inject base labor metrics if processing repair tickets
    if (oldBill.purpose === 'repair') {
      computedTotal += Number(serviceCharge || 0);
    }

    // 5. Commit calculations back into base database document properties
    oldBill.items = finalizedProcessedItems;
    oldBill.serviceCharge = oldBill.purpose === 'repair' ? Number(serviceCharge || 0) : 0;
    oldBill.totalAmount = computedTotal;
    oldBill.isPaid= isPaid
    oldBill.lastUpdated = new Date().toLocaleString();

    await oldBill.save();

    // 6. Return fully populated context dataset straight back to your layout widgets thunk calls
    const completedUpdatedBill = await Bill.findById(oldBill._id).populate('customer');
    res.status(200).json(completedUpdatedBill);

  } catch (err) {
    res.status(500).json({ message: "Failed to save variations onto target invoice document", error: err.message });
  }
};

exports.getBills = async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('customer')
      .populate('device')
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