const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');
const { generateToken, getTokenFromCookies } = require('../utils/auth');
const User = require('../models/user');

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
  const { email } = req.body;
  const code = Math.random().toString().slice(-6);
  const token = generateToken();
  
  try {
    await sendVerificationCode(email, code);
    
    verificationCodes.set(email, {
      code,
      token,
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
  const { email, verifyCode } = req.body;
  const clientIp = req.ip || req.connection.remoteAddress;
  
  try {
    const stored = verificationCodes.get(email);
    if (!stored || stored.expires < Date.now() || stored.code !== verifyCode) {
      return res.json({ success: false, message: '验证码无效或已过期' });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      // 新用户注册
      user = new User({ 
        email,
        token: stored.token,
        registerIp: clientIp,
        lastLoginIp: clientIp
      });
    } else {
      // 已存在用户登录
      user.token = stored.token;
      user.lastLoginIp = clientIp;
    }
    
    await user.save();
    verificationCodes.delete(email);
    
    res.json({ 
      success: true, 
      message: user ? '登录成功' : '注册成功',
      token: stored.token
    });
  } catch (err) {
    console.error('操作失败:', err);
    res.json({ success: false, message: '操作失败，请稍后重试' });
  }
});

module.exports = router;