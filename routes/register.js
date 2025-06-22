const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');
const { generateToken: generateAuthToken, getTokenFromCookies } = require('../utils/auth');
const User = require('../models/user');
const bcrypt = require('bcrypt');
const redis = require('../utils/redis');
const crypto = require('crypto');

// Token 生成函数
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

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
  try {
    const { email, verificationCode } = req.body;
    
    // 验证必填字段
    if (!email || !verificationCode) {
      return res.json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 验证验证码
    const storedCode = await redis.get(`verification:${email}`);
    if (!storedCode || storedCode !== verificationCode) {
      return res.json({
        success: false,
        message: '验证码无效或已过期'
      });
    }

    // 查找或创建用户
    let user = await User.findOne({ email });
    let isNewUser = false;
    
    if (!user) {
      // 创建新用户
      const token = generateToken(); // 生成新的 token
      user = new User({
        email,
        token,
        registerIp: req.ip || '0.0.0.0',
        role: 'user'
      });
      await user.save();
      isNewUser = true;
    } else {
      // 现有用户登录，可能需要更新 token
      if (!user.token) {
        user.token = generateToken();
        await user.save();
      }
    }

    // 删除已使用的验证码
    await redis.del(`verification:${email}`);

    // 返回成功响应，包含 token
    res.json({ 
      success: true, 
      message: isNewUser ? '注册成功' : '登录成功',
      token: user.token
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