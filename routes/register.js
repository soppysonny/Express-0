const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');
const User = require('../models/user');

// 存储验证码
const verificationCodes = new Map();

// 显示注册页面
router.get('/', function(req, res) {
  res.render('register');
});

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  
  try {
    // 检查邮箱是否已注册
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: '该邮箱已注册' });
    }

    const code = Math.random().toString().slice(-6);
    await sendVerificationCode(email, code);
    
    verificationCodes.set(email, {
      code,
      expires: Date.now() + 10 * 60 * 1000
    });
    
    res.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    console.error('发送验证码失败:', err);
    res.json({ success: false, message: '验证码发送失败' });
  }
});

// 处理注册
router.post('/', async function(req, res) {
  const { username, email, verifyCode } = req.body;
  
  try {
    // 验证验证码
    const stored = verificationCodes.get(email);
    if (!stored || stored.expires < Date.now() || stored.code !== verifyCode) {
      return res.json({ success: false, message: '验证码无效或已过期' + stored.code });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }]
    });
    
    if (existingUser) {
      return res.json({ 
        success: false, 
        message: existingUser.username === username ? '用户名已存在' : '邮箱已注册'
      });
    }

    // 创建新用户
    const user = new User({ username, email });
    await user.save();
    
    // 清除验证码
    verificationCodes.delete(email);
    
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    console.error('注册失败:', err);
    res.json({ success: false, message: '注册失败，请稍后重试' });
  }
});

module.exports = router;