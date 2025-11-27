const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const Token = require('../models/token');

// Staff login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const staff = await Staff.findOne({ email });
    // CORRECTED: Use the matchPassword function to securely compare passwords
    if (staff && (await staff.matchPassword(password))) {
      res.json({ success: true, staff });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// NEW: Route for staff to update their own status
router.post('/status', async (req, res) => {
    try {
        const { staffId, status } = req.body;
        const staff = await Staff.findByIdAndUpdate(staffId, { status }, { new: true });
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
        
        const io = req.app.get('io');
        io.emit('staffStatusUpdated', { staffId: staff._id, service: staff.assignedService, status: staff.status });
        
        res.json({ success: true, message: 'Status updated successfully!', staff });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Staff updates token status
router.post('/token/update', async (req, res) => {
  try {
    const { tokenId, status } = req.body;
    const token = await Token.findById(tokenId);
    if (!token) return res.status(404).json({ success: false, message: 'Token not found' });

    token.status = status;
    await token.save();

    const io = req.app.get('io');
    if (io) io.emit('tokenUpdated', { tokenId, service: token.service, status });

    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;