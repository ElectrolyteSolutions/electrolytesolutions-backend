const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  name: String, // e.g., "Microtek Inverter"
  type: String, // e.g., "Home UPS"
  serialNumber: { type: String, unique: true },
  hardwareId: String,
  repairHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Billing' }]
}, { timestamps: true });

module.exports = mongoose.model('Device', DeviceSchema);