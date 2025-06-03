const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  token: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add pre-save middleware to use email as username if not provided
userSchema.pre('save', function(next) {
  if (!this.username) {
    this.username = this.email;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);