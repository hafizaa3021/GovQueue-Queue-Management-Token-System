const express = require('express');
const router = express.Router();
const Staff = require('../models/staff');
const Token = require('../models/token');
const User = require('../models/user');
const Admin = require('../models/admin');

// --- Admin Login (with Hardcoded User) ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin1' && password === 'admin') {
        return res.json({ success: true, admin: { name: 'Main Administrator' } });
    }
    // Fallback for other potential admin accounts in DB
    try {
        const admin = await Admin.findOne({ username });
        if (admin && (await admin.matchPassword(password))) {
            return res.json({ success: true, admin });
        }
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- Analytics Route ---
router.get('/analytics', async (req, res) => {
    try {
        const totalTokens = await Token.countDocuments();
        const pending = await Token.countDocuments({ status: 'booked' });
        const completed = await Token.countDocuments({ status: 'Completed' });
        const activeStaff = await Staff.countDocuments();
        res.json({ success: true, analytics: { totalTokens, pending, completed, activeStaff } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// --- Staff Management Routes ---
router.get('/staff', async (req, res) => {
    try {
        const staff = await Staff.find().sort({ name: 1 });
        res.json({ success: true, staff });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.post('/staff', async (req, res) => {
    try {
        const { name, email, password, assignedService } = req.body;
        const existingStaff = await Staff.findOne({ email });
        if (existingStaff) {
            return res.status(400).json({ success: false, message: 'Staff with this email already exists.' });
        }
        const newStaff = new Staff({ name, email, password, assignedService });
        await newStaff.save();
        res.json({ success: true, staff: newStaff });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

router.delete('/staff/:id', async (req, res) => {
    try {
        const staff = await Staff.findByIdAndDelete(req.params.id);
        if (!staff) return res.status(404).json({ success: false, message: 'Staff not found.' });
        res.json({ success: true, message: 'Staff member deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// --- User List Route ---
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}, 'name email').sort({ name: 1 });
        res.json({ success: true, users });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET a single user's profile for admin view
router.get('/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Delete a user and their tokens
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        // Also delete all tokens associated with this user
        await Token.deleteMany({ userId: req.params.id });

        res.json({ success: true, message: 'User and all their tokens have been deleted.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// --- Token Status Route ---
router.get('/tokens', async (req, res) => {
    try {
        const tokens = await Token.find().populate('userId', 'name email').sort({ createdAt: -1 });
        res.json({ success: true, tokens });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;