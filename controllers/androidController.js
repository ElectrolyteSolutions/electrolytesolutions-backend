const Android = require('../models/Androids');

// Register or update android push token
exports.registerAndroid = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // Upsert so the same android doesn't get duplicated
    await Android.findOneAndUpdate(
      { token },
      { token, updatedAt: Date.now() },
      { upsert: true, new: true }
    );

    const totalAndroids = await Android.countDocuments();
    res.status(200).json({ success: true, totalAndroids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Broadcast notification to all stored androids
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, body, data } = req.body;

    const androids = await Android.find({});
    const tokens = androids.map(d => d.token);

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'No androids registered in database.' });
    }

    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: title || 'ElectroStore Update 🚀',
      body: body || 'Check out our latest products!',
      data: data || { screen: 'ShopTab' },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    res.status(200).json({ success: true, sentCount: tokens.length, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
