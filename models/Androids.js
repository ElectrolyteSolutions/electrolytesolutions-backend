const mongoose = require('mongoose');

const androidSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true ,sparse: true},
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Android', androidSchema);
