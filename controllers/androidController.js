const admin = require('firebase-admin');
const Android = require('../models/Androids');

// Register or update android push token
exports.registerAndroid = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await Android.findOneAndUpdate(
      { token },
      { token, updatedAt: Date.now() },
      { upsert: true, returnDocument: 'after' }
    );

    const totalAndroids = await Android.countDocuments();
    res.status(200).json({ success: true, totalAndroids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Broadcast notification to all stored androids using Firebase FCM
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, body, data } = req.body;

    const androids = await Android.find({});
    const tokens = androids.map(d => d.token);

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'No androids registered in database.' });
    }

    const message = {
      tokens: tokens, // Firebase multicast accepts an array of raw FCM tokens
      notification: {
        title: title || 'Electrolyte Admin 🚀',
        body: body || 'New update available!',
      },
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    res.status(200).json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Send notification to a selected device token or database ID using Firebase FCM
exports.sendToDevice = async (req, res) => {
  try {
    const { token, deviceId, title, body, data } = req.body;

    let targetToken = token;

    if (!targetToken && deviceId) {
      const record = await Android.findById(deviceId);
      if (record) {
        targetToken = record.token;
      }
    }

    if (!targetToken) {
      return res.status(400).json({ error: 'A valid device token or deviceId is required.' });
    }

    const message = {
      token: targetToken, // Raw FCM token
      notification: {
        title: title || 'Electrolyte Admin 🚀',
        body: body || 'New notification received.',
      },
      data: data || {},
    };

    const response = await admin.messaging().send(message);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};