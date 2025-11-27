const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  service: { type: String, required: true },
  date: { type: String, required: true },
  status: {
    type: String,
    default: 'booked',
    enum: [
      'booked', 'Notified', 'Processing', 'Completed', 'No Show',
      'Cancelled by User', 'Cancelled by Admin', 'Moved to Next Day',
      'Awaiting Confirmation', 'On Hold', 'Expired',
      'Ready to Resume' // ADDED
    ]
  },
  tokenNumber: { type: Number, required: true },
  duration: { type: Number },
  feedbackGiven: { type: Boolean, default: false },
  processingStartedAt: { type: Date },
  remindedAt: { type: Date },
  holdExpiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Token', tokenSchema);