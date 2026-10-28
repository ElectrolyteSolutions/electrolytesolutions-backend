const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceName: { type: String, required: true },
  deviceHardwareId: { type: String, unique: true ,sparse:true},
  owner: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Customer', 
    required: true 
  },
  issues: [{ type: String, required: true }],
  bills: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Bill', 
    required: true  }], // List of bill IDs
  deviceRepairingStatus: { 
    type: String, 
    enum: ['in-progress', 'resolved', 'rejected'], 
    default: 'in-progress' 
  },
  deviceType:{type:String,required:true},
  lastUpdated: { type: String, default: () => new Date().toLocaleString() }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
