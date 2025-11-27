const express = require('express');
const router = express.Router();
const Token = require('../models/token');
const User = require('../models/user');

// --- Book Token (User) ---
router.post('/book', async (req, res) => {
  try {
    const { userId, userName, service, date } = req.body;
    if (!userId || !service || !date)
      return res.json({ success: false, message: 'Missing fields' });

    // Generate token number for that service
    const lastToken = await Token.findOne({ service }).sort({ tokenNumber: -1 });
    const tokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;

    const newToken = new Token({
      userId,
      userName,
      service,
      tokenNumber,
      status: 'Pending',
      date
    });

    await newToken.save();

    // Notify staff in real-time
    const io = req.app.get('io');
    if (io) io.emit('tokenUpdated', { tokenId: newToken._id, service, status: newToken.status });

    res.json({ success: true, token: newToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// --- Get all tokens for a user ---
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const tokens = await Token.find({ userId });
    res.json({ success: true, name: user.name, tokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
