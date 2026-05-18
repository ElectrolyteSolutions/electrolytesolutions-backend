const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  deviceName: { type: String, required: true },
  issues: [{ type: String, required: true }],
  deviceHardwareId: { type: String, required: true, unique: true },
  bills: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bill', 
    required: true  }], // List of bill IDs
  deviceRepairingStatus: { 
    type: String, 
    enum: ['in-progress', 'resolved', 'rejected'], 
    default: 'in-progress' 
  },
  lastUpdated: { type: String, default: () => new Date().toLocaleString() }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);