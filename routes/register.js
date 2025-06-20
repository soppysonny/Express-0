const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');
const { generateToken, getTokenFromCookies } = require('../utils/auth');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const redis = require('../utils/redis');

// 存储验证码的 Map
const verificationCodes = new Map();

// 显示注册页面
router.get('/', function(req, res) {
  const token = getTokenFromCookies(req.headers.cookie);
  
  if (token) {
    return res.redirect('/');
  }
  
  res.render('register');
});

// 发送验证码
router.post('/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    const code = Math.random().toString().slice(-6);
    
    // Store verification code in Redis with 10 minutes expiration
    await redis.set(`verification:${email}`, code, {
      EX: 600 // 10 minutes
    });
    
    await sendVerificationCode(email, code);
    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    console.error('发送验证码失败:', err);
    res.json({ success: false, message: '验证码发送失败' });
  }
});

// 处理注册
router.post('/', async function(req, res) {
  const { email, verifyCode } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    // Get verification code from Redis
    const storedCode = await redis.get(`verification:${email}`);
    if (!storedCode || storedCode !== verifyCode) {
      return res.json({ 
        success: false, 
        message: '验证码无效或已过期' 
      });
    }

    // Generate new token
    const token = generateToken();

    let user = await User.findOne({ email });
    
    if (!user) {
      // 新用户注册
      user = new User({ 
        email,
        token,
        registerIp: clientIp,
        lastLoginIp: clientIp
      });
    } else {
      // 已存在用户登录
      user.token = token;
      user.lastLoginIp = clientIp;
    }
    
    await user.save();
    // Delete verification code after successful registration
    await redis.del(`verification:${email}`);
    
    res.json({ 
      success: true, 
      message: user ? '登录成功' : '注册成功',
      token
    });
  } catch (err) {
    console.error('操作失败:', err);
    res.json({ 
      success: false, 
      message: '操作失败，请稍后重试' 
    });
  }
});

// 注册新用户
router.post('/register', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    
    // Validate required fields
    if (!email || !verificationCode) {
      return res.json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // Verify email code
    const storedCode = await redis.get(`verification:${email}`);
    if (!storedCode || storedCode !== verificationCode) {
      return res.json({
        success: false,
        message: '验证码无效或已过期'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({
        success: false,
        message: '该邮箱已被注册'
      });
    }

    // Create new user
    const token = generateToken();
    const user = new User({
      email,
      token,
      registerIp: req.socket.remoteAddress || '0.0.0.0',
      lastLoginIp: req.socket.remoteAddress || '0.0.0.0'
    });

    await user.save();

    // Delete verification code after successful registration
    await redis.del(`verification:${email}`);

    res.json({
      success: true,
      message: '注册成功',
      token
    });

  } catch (err) {
    console.error('注册失败:', err);
    res.json({
      success: false,
      message: '注册失败，请重试'
    });
  }
});

module.exports = router;