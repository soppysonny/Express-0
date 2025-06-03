const mongoose = require('mongoose');

const adminLoginSchema = new mongoose.Schema({
  ip: String,
  lastAttempt: Date,
  attempts: Number
});

module.exports = mongoose.model('AdminLogin', adminLoginSchema);