const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Please add a name'] 
  },
  email: { 
    type: String, 
    required: [true, 'Please add an email'], 
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false // Ensures password isn't returned in queries by default
  },
  address:{
    type:String,
    required:false
  },
  phone:{
    type:String,
    required:false
  },
  role: { 
    type: String, 
    enum: ['admin', 'store', 'customer'], 
    default: 'customer' 
  },
  sessions: [{
    sessionId: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    loginAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

// ⚡ Encrypt password using bcrypt before saving
userSchema.pre('save', async function() {
  // Skip if password is not being modified
  if (!this.isModified('password')) {
    return; // Just return normally
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ⚡ Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);