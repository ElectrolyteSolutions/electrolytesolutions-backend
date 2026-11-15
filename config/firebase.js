// config/firebase.js
const admin = require('firebase-admin');

console.log('DEBUG: Type of loaded firebase-admin:', typeof admin);
console.log('DEBUG: Value of loaded firebase-admin:', admin);

console.log('DEBUG Project ID:', process.env.FIREBASE_PROJECT_ID);
console.log('DEBUG Private Key starts with:', process.env.FIREBASE_PRIVATE_KEY?.substring(0, 30));

if (!admin || typeof admin.initializeApp !== 'function') {
  throw new Error(`❌ firebase-admin loaded as "${typeof admin}". Your node_modules/firebase-admin folder is corrupted.`);
}


if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')})
  });
  console.log('🔥 Firebase Admin successfully initialized!');
}

module.exports = admin;