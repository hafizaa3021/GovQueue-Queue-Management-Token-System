require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const {
    Server
} = require('socket.io');
const bcrypt = require('bcryptjs');
const {
    Parser
} = require('json2csv');

// --- Models ---
const Staff = require('./models/staff');
const User = require('./models/user');
const Token = require('./models/token');
const Admin = require('./models/admin');
const Message = require('./models/message');
const Feedback = require('./models/feedback');
const Announcement = require('./models/announcement');

// --- Routes ---
const adminRoutes = require('./routes/adminRoutes');
const staffRoutes = require('./routes/staffRoutes');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

// Socket.IO Connection Logic
io.on('connection', (socket) => {
    socket.on('joinRoom', (userId) => {
        socket.join(userId);
    });
});

// --- Middleware & DB Connection ---
app.use(cors());
app.use(express.json());
app.set('io', io);
mongoose.connect('mongodb+srv://govqueue_user:hN%21hPw%406VpyT%40pg@queueproject.kpemdq2.mongodb.net/govqueue?retryWrites=true&w=majority', {
        serverSelectionTimeoutMS: 30000, 
        socketTimeoutMS: 45000, 
    }).then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));
    
// --- API Routes ---
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);


app.post('/api/staff/update-token', async (req, res) => {
    const {
        tokenId,
        status,
        holdMinutes
    } = req.body;
    const token = await Token.findById(tokenId);
    if (!token) return res.status(404).json({
        success: false,
        message: 'Token not found.'
    });

    if (status === 'On Hold') {
        token.status = 'On Hold';
        if (holdMinutes) {
            token.holdExpiresAt = new Date(Date.now() + holdMinutes * 60000);
        }
    } else if (status === 'Resume') {
        token.status = 'Processing';
        token.processingStartedAt = new Date();
        token.holdExpiresAt = null;
    } else if (status === 'No Show') {
        const now = new Date();
        if (now.getHours() >= 23 && now.getMinutes() >= 30) {
            token.status = 'No Show';
        } else {
            token.status = 'Awaiting Confirmation';
        }
    } else {
        token.status = status;
    }

    await token.save();

    if (token.status === 'Awaiting Confirmation') {
        io.emit('confirmNoShow', {
            userId: token.userId.toString(),
            tokenId: token._id.toString()
        });
    }

    io.emit('tokenUpdated', token);
    res.json({
        success: true,
        token
    });
});

app.post('/api/bookToken', async (req, res) => {
    try {
        const {
            userId,
            service,
            date
        } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({
            success: false,
            message: 'User not found.'
        });

        const staff = await Staff.findOne({
            assignedService: service
        });
        const now = new Date();
        const isToday = new Date(date).toDateString() === now.toDateString();

        if (isToday && (now.getHours() > 23 || (now.getHours() === 23 && now.getMinutes() >= 30) || (staff && staff.status === 'Closed'))) {
            return res.status(400).json({
                success: false,
                message: 'This counter is closed for today. Please book for the next available day.'
            });
        }

        const lastToken = await Token.findOne({
            service,
            date
        }).sort({
            tokenNumber: -1
        });
        const tokenNumber = lastToken ? lastToken.tokenNumber + 1 : 1;
        const duration = 15;
        const tokensAhead = await Token.countDocuments({
            service,
            date,
            status: {
                $in: ['booked', 'Processing', 'Notified', 'Moved to Next Day']
            }
        });
        const waitTime = tokensAhead * duration;
        const token = new Token({
            userId: user._id,
            name: user.name,
            email: user.email,
            service,
            tokenNumber,
            date,
            status: 'booked',
            duration
        });
        await token.save();
        io.emit('newToken', token);
        res.json({
            success: true,
            token,
            waitTime
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.get('/api/user/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({
            success: false,
            message: 'User not found'
        });

        const userTokens = await Token.find({
            userId: req.params.id,
            status: {
                $ne: 'Expired'
            }
        }).sort({
            createdAt: -1
        }).lean();

        const tokensWithWaitTime = await Promise.all(userTokens.map(async (token) => {
            if ((['booked', 'Notified', 'Moved to Next Day', 'Ready to Resume'].includes(token.status)) && !token.noShowRejoin) {
                const duration = token.duration || 15;
                const tokensAhead = await Token.countDocuments({
                    service: token.service,
                    date: token.date,
                    status: {
                        $in: ['booked', 'Processing', 'Notified', 'Moved to Next Day']
                    },
                    tokenNumber: {
                        $lt: token.tokenNumber
                    }
                });
                token.remainingTime = tokensAhead * duration;
            } else if (token.noShowRejoin) {
                token.remainingTime = 15;
            }
            return token;
        }));

        res.json({
            success: true,
            name: user.name,
            tokens: tokensWithWaitTime
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

app.get('/api/admin/feedback', async (req, res) => {
    try {
        const feedback = await Feedback.find().populate('userId', 'name').sort({
            createdAt: -1
        });
        res.json({
            success: true,
            feedback
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/admin/login', async (req, res) => {
    const {
        username,
        password
    } = req.body;
    if (username === 'admin1' && password === 'admin') {
        return res.json({
            success: true,
            admin: {
                name: 'Main Administrator'
            }
        });
    }
    try {
        const admin = await Admin.findOne({
            username
        });
        if (admin && (await admin.matchPassword(password))) {
            return res.json({
                success: true,
                admin
            });
        }
        res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});
app.post('/api/admin/call-next', async (req, res) => {
    const {
        service,
        date
    } = req.body;
    const nextToken = await Token.findOne({
        service,
        date,
        status: {
            $in: ['Notified', 'booked', 'Moved to Next Day']
        }
    }).sort({
        tokenNumber: 1
    });
    if (!nextToken) return res.status(404).json({
        success: false,
        message: 'No more pending tokens for this service.'
    });
    nextToken.status = 'Processing';
    nextToken.processingStartedAt = new Date();
    await nextToken.save();
    io.emit('tokenUpdated', nextToken);
    res.json({
        success: true,
        message: `Called next token for ${service}.`
    });
});
app.post('/api/admin/cancel-token', async (req, res) => {
    const {
        tokenId
    } = req.body;
    const token = await Token.findByIdAndUpdate(tokenId, {
        status: 'Cancelled by Admin'
    }, {
        new: true
    });
    if (!token) return res.status(404).json({
        success: false,
        message: 'Token not found.'
    });
    io.emit('tokenUpdated', token);
    res.json({
        success: true,
        message: 'Token has been cancelled.'
    });
});
app.post('/api/admin/reset-user-password', async (req, res) => {
    const {
        userId,
        newPassword
    } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({
        success: false,
        message: 'User not found.'
    });
    user.password = newPassword;
    await user.save();
    res.json({
        success: true,
        message: `Password for user ${user.name} has been reset.`
    });
});
app.post('/api/admin/reset-staff-password', async (req, res) => {
    const {
        staffId,
        newPassword
    } = req.body;
    const staff = await Staff.findById(staffId);
    if (!staff) return res.status(404).json({
        success: false,
        message: 'Staff member not found.'
    });
    staff.password = newPassword;
    await staff.save();
    res.json({
        success: true,
        message: `Password for staff ${staff.name} has been reset.`
    });
});
app.post('/api/contact', async (req, res) => {
    try {
        const {
            name,
            email,
            message
        } = req.body;
        if (!name || !email || !message) return res.status(400).json({
            success: false,
            message: 'All fields are required.'
        });
        const newMessage = new Message({
            name,
            email,
            message
        });
        await newMessage.save();
        res.status(201).json({
            success: true,
            message: 'Message sent successfully!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/admin/messages', async (req, res) => {
    try {
        const messages = await Message.find().sort({
            createdAt: -1
        });
        res.json({
            success: true,
            messages
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/signup', async (req, res) => {
    try {
        const {
            name,
            email,
            password
        } = req.body;
        const exist = await User.findOne({
            email
        });
        if (exist) return res.status(400).json({
            success: false,
            message: 'User with this email already exists'
        });
        const user = new User({
            name,
            email,
            password
        });
        await user.save();
        res.status(201).json({
            success: true,
            user,
            message: 'Signup successful!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/login', async (req, res) => {
    const {
        email,
        password
    } = req.body;
    try {
        const user = await User.findOne({
            email
        });
        if (user && (await user.matchPassword(password))) {
            res.json({
                success: true,
                user
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.put('/api/user/profile', async (req, res) => {
    try {
        const {
            userId,
            name,
            email,
            phone,
            address
        } = req.body;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({
            success: false,
            message: 'User not found'
        });
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone;
        user.address = address;
        const updatedUser = await user.save();
        res.json({
            success: true,
            message: 'Profile updated successfully!',
            user: updatedUser
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/user/change-password', async (req, res) => {
    try {
        const {
            userId,
            currentPassword,
            newPassword
        } = req.body;
        const user = await User.findById(userId);
        if (!user || !(await user.matchPassword(currentPassword))) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect current password'
            });
        }
        user.password = newPassword;
        await user.save();
        res.json({
            success: true,
            message: 'Password changed successfully!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/staff/login', async (req, res) => {
    const {
        email,
        password
    } = req.body;
    try {
        const staff = await Staff.findOne({
            email
        });
        if (staff && (await staff.matchPassword(password))) {
            res.json({
                success: true,
                staff
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.put('/api/staff/profile', async (req, res) => {
    try {
        const {
            staffId,
            name,
            email
        } = req.body;
        const staff = await Staff.findById(staffId);
        if (!staff) return res.status(404).json({
            success: false,
            message: 'Staff not found'
        });
        staff.name = name || staff.name;
        staff.email = email || staff.email;
        const updatedStaff = await staff.save();
        res.json({
            success: true,
            message: 'Profile updated successfully!',
            staff: updatedStaff
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/staff/change-password', async (req, res) => {
    try {
        const {
            staffId,
            currentPassword,
            newPassword
        } = req.body;
        const staff = await Staff.findById(staffId);
        if (!staff || !(await staff.matchPassword(currentPassword))) {
            return res.status(401).json({
                success: false,
                message: 'Incorrect current password'
            });
        }
        staff.password = newPassword;
        await staff.save();
        res.json({
            success: true,
            message: 'Password changed successfully!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/staff/tokens', async (req, res) => {
    const {
        service,
        date
    } = req.query;
    const tokens = await Token.find({
        service,
        date,
        status: {
            $in: ['booked', 'Processing', 'Notified', 'Awaiting Confirmation', 'Moved to Next Day', 'On Hold']
        }
    }).sort({
        tokenNumber: 1
    });
    const totalInQueue = await Token.countDocuments({
        service,
        date,
        status: {
            $in: ['booked', 'Notified', 'Awaiting Confirmation', 'Moved to Next Day']
        }
    });
    res.json({
        success: true,
        tokens,
        totalInQueue
    });
});
app.post('/api/staff/call-next', async (req, res) => {
    const {
        service,
        date
    } = req.body;
    const nextToken = await Token.findOne({
        service,
        date,
        status: {
            $in: ['Notified', 'booked', 'Moved to Next Day']
        }
    }).sort({
        tokenNumber: 1
    });
    if (!nextToken) return res.status(404).json({
        success: false,
        message: 'No more pending tokens.'
    });
    nextToken.status = 'Processing';
    nextToken.processingStartedAt = new Date();
    await nextToken.save();
    io.emit('tokenUpdated', nextToken);
    res.json({
        success: true,
        token: nextToken
    });
});
app.post('/api/staff/remind', async (req, res) => {
    const {
        tokenId,
        staffName
    } = req.body;
    const token = await Token.findById(tokenId);
    if (!token) return res.status(404).json({
        success: false,
        message: 'Token not found.'
    });
    token.remindedAt = new Date();
    await token.save();
    const message = "This is a reminder for your token that was moved to today. Are you planning to visit? If not, your token will expire in 24 hours.";
    io.to(token.userId.toString()).emit('staffMessage', {
        from: staffName,
        message
    });
    res.json({
        success: true,
        message: 'Reminder sent successfully.'
    });
});
app.post('/api/staff/move-queue-to-tomorrow', async (req, res) => {
    const {
        service,
        date
    } = req.body;
    try {
        const {
            nModified
        } = await Token.updateMany({
            service,
            date,
            status: {
                $in: ['booked', 'Notified', 'Awaiting Confirmation']
            }
        }, {
            $set: {
                status: 'Moved to Next Day'
            }
        });
        if (nModified > 0) {
            io.emit('queueMoved', {
                service,
                date
            });
            res.json({
                success: true,
                message: 'All remaining users have been notified to come tomorrow.'
            });
        } else {
            res.json({
                success: false,
                message: 'No pending users to move.'
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/staff/message', (req, res) => {
    const {
        userId,
        message,
        staffName
    } = req.body;
    if (!userId || !message || !staffName) return res.status(400).json({
        success: false,
        message: 'Missing required fields.'
    });
    io.to(userId).emit('staffMessage', {
        from: staffName,
        message
    });
    res.json({
        success: true,
        message: 'Message sent successfully.'
    });
});
app.post('/api/user/rejoin-queue', async (req, res) => {
    const {
        tokenId
    } = req.body;
    const token = await Token.findById(tokenId);
    if (!token) return res.status(404).json({
        success: false,
        message: 'Token not found.'
    });
    token.status = 'booked';
    token.noShowRejoin = true;
    await token.save();
    io.emit('tokenUpdated', token);
    res.json({
        success: true,
        message: 'You have been added back to the queue.'
    });
});
app.post('/api/user/cancel-no-show', async (req, res) => {
    const {
        tokenId
    } = req.body;
    const token = await Token.findByIdAndUpdate(tokenId, {
        status: 'No Show'
    }, {
        new: true
    });
    if (token) io.emit('tokenUpdated', token);
    res.json({
        success: true,
        message: 'Your token has been cancelled.'
    });
});
app.post('/api/user/cancel-token', async (req, res) => {
    try {
        const {
            tokenId
        } = req.body;
        const token = await Token.findByIdAndUpdate(tokenId, {
            status: 'Cancelled by User'
        }, {
            new: true
        });
        if (!token) return res.status(404).json({
            success: false,
            message: 'Token not found.'
        });
        io.emit('tokenUpdated', token);
        res.json({
            success: true,
            message: 'Token cancelled successfully.'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/tokens/public', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const services = ["Aadhar Card", "Voter ID", "Passport", "Driving License", "PAN Card", "Ration Card", "Birth Certificate", "Marriage Certificate", "Income Certificate", "Caste Certificate"];
        const publicData = {};
        for (const service of services) {
            const currentlyServingToken = await Token.findOne({
                service,
                date: today,
                status: 'Processing'
            }).sort({
                tokenNumber: -1
            });
            const totalInQueue = await Token.countDocuments({
                service,
                date: today,
                status: {
                    $in: ['booked', 'Processing', 'Notified', 'Awaiting Confirmation', 'Moved to Next Day']
                }
            });
            const assignedStaff = await Staff.findOne({
                assignedService: service
            });
            publicData[service] = {
                currentlyServing: currentlyServingToken ? currentlyServingToken.tokenNumber : '--',
                totalInQueue: totalInQueue,
                staffStatus: assignedStaff ? assignedStaff.status : 'Offline'
            };
        }
        res.json({
            success: true,
            publicData
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/feedback', async (req, res) => {
    try {
        const {
            tokenId,
            userId,
            service,
            rating,
            comment
        } = req.body;
        const token = await Token.findById(tokenId);
        if (!token || token.userId.toString() !== userId) return res.status(403).json({
            success: false,
            message: 'Unauthorized'
        });
        if (token.feedbackGiven) return res.status(400).json({
            success: false,
            message: 'Feedback already submitted for this token.'
        });
        const newFeedback = new Feedback({
            tokenId,
            userId,
            service,
            rating,
            comment
        });
        await newFeedback.save();
        token.feedbackGiven = true;
        await token.save();
        res.status(201).json({
            success: true,
            message: 'Thank you for your feedback!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/announcements/active', async (req, res) => {
    try {
        const announcement = await Announcement.findOne({
            isActive: true
        }).sort({
            createdAt: -1
        });
        res.json({
            success: true,
            announcement
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/admin/announcements', async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({
            createdAt: -1
        });
        res.json({
            success: true,
            announcements
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.post('/api/admin/announcements', async (req, res) => {
    try {
        await Announcement.updateMany({}, {
            isActive: false
        });
        const newAnnouncement = new Announcement({
            message: req.body.message,
            isActive: true
        });
        await newAnnouncement.save();
        io.emit('announcementUpdated');
        res.status(201).json({
            success: true,
            announcement: newAnnouncement
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.put('/api/admin/announcements/:id/deactivate', async (req, res) => {
    try {
        const announcement = await Announcement.findByIdAndUpdate(req.params.id, {
            isActive: false
        }, {
            new: true
        });
        if (!announcement) return res.status(404).json({
            success: false,
            message: 'Announcement not found'
        });
        io.emit('announcementUpdated');
        res.json({
            success: true,
            announcement
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/admin/analytics/peak-hours', async (req, res) => {
    try {
        const peakHours = await Token.aggregate([{
            $project: {
                hour: {
                    $hour: "$createdAt"
                }
            }
        }, {
            $group: {
                _id: "$hour",
                count: {
                    $sum: 1
                }
            }
        }, {
            $sort: {
                _id: 1
            }
        }]);
        res.json({
            success: true,
            peakHours
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});
app.get('/api/admin/analytics/report', async (req, res) => {
    try {
        const tokens = await Token.find().populate('userId', 'name email').lean();
        const fields = ['tokenNumber', 'service', 'status', 'date', 'userId.name', 'userId.email'];
        const opts = {
            fields
        };
        const parser = new Parser(opts);
        const csv = parser.parse(tokens);
        res.header('Content-Type', 'text/csv');
        res.attachment('govqueue-report.csv');
        res.send(csv);
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
});


// Auto-expire tokens logic
setInterval(async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    try {
        const result = await Token.updateMany({
            status: 'Moved to Next Day',
            remindedAt: {
                $lt: twentyFourHoursAgo
            }
        }, {
            $set: {
                status: 'Expired'
            }
        });
        if (result.nModified > 0) {
            console.log(`Expired ${result.nModified} tokens.`);
            io.emit('tokenUpdated');
        }
    } catch (err) {
        console.error('Error expiring tokens:', err);
    }
}, 3600000);

setInterval(async () => {
    try {
        const expiredOnHoldTokens = await Token.find({
            status: 'On Hold',
            holdExpiresAt: {
                $lt: new Date()
            }
        });
        for (const token of expiredOnHoldTokens) {
            token.status = 'Ready to Resume';
            token.holdExpiresAt = null;
            await token.save();
            io.to(token.userId.toString()).emit('holdExpired', {
                message: `Your hold time for token #${token.tokenNumber} is over. Please return to the counter.`
            });
        }
        if (expiredOnHoldTokens.length > 0) {
            console.log(`Resumed ${expiredOnHoldTokens.length} expired hold tokens.`);
            io.emit('tokenUpdated');
        }
    } catch (err) {
        console.error('Error processing expired hold tokens:', err);
    }
}, 60000);

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = server;