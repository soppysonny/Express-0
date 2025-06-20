const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  token: String,
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  registerIp: String,
  lastLoginIp: String,
  subscription: {
    planId: String,
    status: String,
    transactionId: String,
    purchaseDate: Date,
    expiresDate: Date,
    autoRenew: Boolean,
    clientOS: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);