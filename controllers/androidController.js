const admin = require('../config/firebase'); 
const Android = require('../models/Androids');

// Helper to ensure Firebase Messaging is ready
const getMessaging = () => {
  if (!admin || !admin.apps || admin.apps.length === 0) {
    throw new Error('Firebase Admin SDK is not initialized yet.');
  }
  return admin.messaging();
};

// 1. Register or update android push token
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

// 2. List all registered devices
exports.listDevices = async (req, res) => {
  try {
    const devices = await Android.find({}).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, count: devices.length, devices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. Delete a specific device by database ID
exports.deleteDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Android.findByIdAndDelete(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Device not found in database.' });
    }

    const totalAndroids = await Android.countDocuments();
    res.status(200).json({ success: true, message: 'Device deleted successfully', totalAndroids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Delete a specific device by raw token
exports.deleteDeviceByToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    const deleted = await Android.findOneAndDelete({ token });
    if (!deleted) {
      return res.status(404).json({ error: 'Token not found in database.' });
    }

    const totalAndroids = await Android.countDocuments();
    res.status(200).json({ success: true, message: 'Token deleted successfully', totalAndroids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. Delete all registered devices
exports.deleteAllDevices = async (req, res) => {
  try {
    await Android.deleteMany({});
    res.status(200).json({ success: true, message: 'All registered android devices cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Broadcast notification to all stored androids using Firebase FCM
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, body, data } = req.body || {};

    const androids = await Android.find({});
    const tokens = androids.map(d => d.token).filter(token => token && typeof token === 'string');

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'No valid android tokens registered in database.' });
    }

    const message = {
      tokens: tokens,
      notification: {
        title: title || 'Electrolyte Admin 🚀',
        body: body || 'New update available!',
      },
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // 🔍 Log exact errors for any failed tokens
    if (response.failureCount > 0) {
      console.log('⚠️ Firebase Multicast Failures Details:');
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Token index [${idx}] (${tokens[idx]}) failed with error:`, resp.error);
        }
      });
    }

    res.status(200).json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount,
      // Optional: return errors in response body for easy terminal viewing
      errors: response.responses
        .map((r, i) => (!r.success ? { token: tokens[i], error: r.error.message } : null))
        .filter(Boolean)
    });
  } catch (error) {
    console.error('Broadcast Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 7. Send notification to a selected device token or database ID using Firebase FCM
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
      token: targetToken,
      notification: {
        title: title || 'Electrolyte Admin 🚀',
        body: body || 'New notification received.',
      },
      data: data || {},
    };

    const messaging = getMessaging();
    const response = await messaging.send(message);
    res.status(200).json({ success: true, messageId: response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};