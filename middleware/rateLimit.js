const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: '尝试次数过多，请15分钟后重试'
  },
  // Use request IP instead of forwarded IP
  keyGenerator: (req) => req.socket.remoteAddress || '0.0.0.0',
  trustProxy: false
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    success: false,
    message: '请求过于频繁，请稍后重试'
  },
  keyGenerator: (req) => req.socket.remoteAddress || '0.0.0.0',
  trustProxy: false
});

module.exports = {
  loginLimiter,
  apiLimiter
};