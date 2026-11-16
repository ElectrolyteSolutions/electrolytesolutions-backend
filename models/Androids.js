const mongoose = require('mongoose');

const androidSchema = new mongoose.Schema({
    token: { 
        type: String, 
        required: true, 
        unique: true, 
        sparse: true 
    },
    user: { 
        type: String 
    }, // Added comma here
    userId: { 
        type: String 
    }, // Added comma here and explicitly set type
    deviceData: { 
        type: Object 
    }, // Added comma here and explicitly set type
    deviceHardwareId: { 
        type: String, 
        unique: true, 
        sparse: true // Crucial: tells MongoDB to ignore null/missing values
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
});

module.exports = mongoose.model('Android', androidSchema);