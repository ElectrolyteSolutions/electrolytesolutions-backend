// Example Express routes to add to your existing backend

// 1. Save or Update Device Token when app opens
app.post('/api/notifications/register', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token is required' });

    // TODO: Save 'token' to your existing database (e.g., MongoDB, PostgreSQL, Supabase)
    // Example logic: db.devices.updateOne({ token }, { $set: { token, updatedAt: new Date() } }, { upsert: true });

    res.status(200).json({ success: true, message: 'Device token registered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2. Broadcast Notification to All Saved Devices
app.post('/api/notifications/broadcast', async (req, res) => {
  try {
    const { title, body, data } = req.body;

    // TODO: Fetch all unique tokens from your database
    // Example: const allDevices = await db.devices.find({}).toArray();
    // const tokens = allDevices.map(d => d.token);

    if (!tokens || tokens.length === 0) {
      return res.status(400).json({ error: 'No registered devices found in database.' });
    }

    // Format messages for Expo's batch push API
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title: title || 'ElectroStore Update 🚀',
      body: body || 'Check out our latest products!',
      data: data || { screen: 'ShopTab' },
    }));

    // Dispatch batch request to Expo
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
    res.status(200).json({ success: true, totalSent: tokens.length, result });
  } catch (error) {
    console.error('Broadcast error:', error);
    res.status(500).json({ error: 'Failed to broadcast notifications' });
  }
});