// db.js
const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    console.log('⚡ Using cached MongoDB connection');
    return cached.conn;
  }

  if (!cached.promise) {
    console.log('🔄 Establishing new MongoDB connection...');
    const opts = {
      bufferCommands: false, // Disables buffering so it fails fast if disconnected
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts).then((mongooseInstance) => {
      console.log('✅ New MongoDB connection established successfully');
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    console.error('❌ MongoDB connection error:', e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = connectDB;