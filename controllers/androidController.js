const admin = require('../config/firebase');
const Android = require('../models/Androids');
const Customer = require('../models/Customers') ;

// Helper to ensure Firebase Messaging is ready
const getMessaging = () => {
  if (!admin || !admin.apps || admin.apps.length === 0) {
    throw new Error('Firebase Admin SDK is not initialized yet.');
  }
  return admin.messaging();
};

const sendNotificationToUser = async (userId, title, body, data = {}) => {
  try {
    if (!userId) throw new Error('User ID is required to send notification.');

    const devices = await Android.find({ userId: userId });
    const tokens = devices.map(d => d.token).filter(token => token && typeof token === 'string');

    if (tokens.length === 0) {
      return { success: false, message: `No active device tokens found for user: ${userId}` };
    }

    const messaging = getMessaging();

    if (tokens.length === 1) {
      const message = {
        token: tokens[0],
        notification: {
          title: title || 'Electrolyte Admin',
          body: body || 'New notification received.',
        },
        data: data,
      };
      const response = await messaging.send(message);
      return { success: true, messageId: response, successCount: 1, failureCount: 0 };
    } else {
      const message = {
        tokens: tokens,
        notification: {
          title: title || 'Electrolyte Admin',
          body: body || 'New notification received.',
        },
        data: data,
      };
      const response = await messaging.sendEachForMulticast(message);
      return { 
        success: true, 
        successCount: response.successCount, 
        failureCount: response.failureCount,
        errors: response.responses.map((r, i) => (!r.success ? { token: tokens[i], error: r.error.message } : null)).filter(Boolean)
      };
    }
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    throw error;
  }
};

const sendNotificationToAdmin = async (title, body, data = {}) => {
  try {
    const devices = await Android.find({ user: "admin" });
    const tokens = devices.map(d => d.token).filter(token => token && typeof token === 'string');

    if (tokens.length === 0) {
      return { success: false, message: `No active device tokens found for admin` };
    }

    const messaging = getMessaging();

    if (tokens.length === 1) {
      const message = {
        token: tokens[0],
        notification: {
          title: title || 'Electrolyte Admin',
          body: body || 'New notification received.',
        },
        data: data,
      };
      const response = await messaging.send(message);
      return { success: true, messageId: response, successCount: 1, failureCount: 0 };
    } else {
      const message = {
        tokens: tokens,
        notification: {
          title: title || 'Electrolyte Admin',
          body: body || 'New notification received.',
        },
        data: data,
      };
      const response = await messaging.sendEachForMulticast(message);
      return { 
        success: true, 
        successCount: response.successCount, 
        failureCount: response.failureCount,
        errors: response.responses.map((r, i) => (!r.success ? { token: tokens[i], error: r.error.message } : null)).filter(Boolean)
      };
    }
  } catch (error) {
    console.error(`Error sending notification to admin:`, error);
    throw error;
  }
};

// Export helpers so orderController can import them
module.exports = {
  sendNotificationToUser,
  sendNotificationToAdmin,
};

// 1. Register or update android push token
module.exports.registerAndroid = async (req, res) => {
  try {
    const { token, user, userId, deviceData } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    await Android.findOneAndUpdate(
      { token },
      { 
        token, 
        user: user || null, 
        userId: userId || null, 
        deviceData: deviceData || {},
        updatedAt: Date.now() 
      },
      { upsert: true, returnDocument: 'after' }
    );

    const totalAndroids = await Android.countDocuments();
    res.status(200).json({ success: true, totalAndroids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. List all registered devices
module.exports.listDevices = async (req, res) => {
  try {
    const devices = await Android.find({}).sort({ updatedAt: -1 }).lean();

    const userIds = [
      ...new Set(
        devices
          .map((d) => d.userId)
          .filter((id) => id !== null && id !== undefined)
      ),
    ];

    const customers = userIds.length
      ? await Customer.find({ _id: { $in: userIds } })
          .select('-password')
          .lean()
      : [];

    const customerMap = new Map(
      customers.map((customer) => [String(customer._id), customer])
    );

    const enrichedDevices = devices.map((device) => ({
      ...device,
      userData: device.userId ? customerMap.get(String(device.userId)) ?? null : null,
    }));

    res.status(200).json({
      success: true,
      count: enrichedDevices.length,
      devices: enrichedDevices,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
   

// 3. Delete a specific device by database ID
module.exports.deleteDeviceById = async (req, res) => {
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
module.exports.deleteDeviceByToken = async (req, res) => {
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
module.exports.deleteAllDevices = async (req, res) => {
  try {
    await Android.deleteMany({});
    res.status(200).json({ success: true, message: 'All registered android devices cleared.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 6. Broadcast notification to all stored androids using Firebase FCM
module.exports.broadcastNotification = async (req, res) => {
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
        title: title || 'Electrolyte Admin',
        body: body || 'New update available!',
      },
      data: data || {},
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    res.status(200).json({ 
      success: true, 
      successCount: response.successCount, 
      failureCount: response.failureCount,
      errors: response.responses
        .map((r, i) => (!r.success ? { token: tokens[i], error: r.error.message } : null))
        .filter(Boolean)
    });
  } catch (error) {
    console.error('Broadcast Error:', error);
    res.status(500).json({ error: error.message });
  }
};

// 7. Send notification to a selected device token or database ID
module.exports.sendToDevice = async (req, res) => {
  try {
    const { token, deviceId, title, body, data } = req.body;
    let targetToken = token;

    if (!targetToken && deviceId) {
      const record = await Android.findById(deviceId);
      if (record) targetToken = record.token;
    }

    if (!targetToken) {
      return res.status(400).json({ error: 'A valid device token or deviceId is required.' });
    }

    const message = {
      token: targetToken,
      notification: {
        title: title || 'Electrolyte Admin',
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

// 8. API Endpoint to send notification to a specific user ID
module.exports.sendToUserApi = async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const result = await sendNotificationToUser(userId, title, body, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports.sendToUserAdminApi = async (req, res) => {
  try {
    const { title, body, data } = req.body;
    const result = await sendNotificationToAdmin(title, body, data);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
