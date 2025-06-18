const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true
  },
  applePlanId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // Duration in days
    required: true
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  clientOS: {
    type: String,
    enum: ['iOS', 'Android', 'All'],
    default: 'All'
  },
  isVisible: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);