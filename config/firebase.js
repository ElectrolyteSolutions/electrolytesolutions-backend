// config/firebase.js
const admin = require('firebase-admin');

console.log('DEBUG: Type of loaded firebase-admin:', typeof admin);
console.log('DEBUG: Value of loaded firebase-admin:', admin);

if (!admin || typeof admin.initializeApp !== 'function') {
  throw new Error(`❌ firebase-admin loaded as "${typeof admin}". Your node_modules/firebase-admin folder is corrupted.`);
}

const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('🔥 Firebase Admin successfully initialized!');
}

module.exports = admin;