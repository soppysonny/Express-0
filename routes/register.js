const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');

// 存储验证码
const verificationCodes = new Map();

// 显示注册页面
router.get('/', function(req, res) {
  res.render('register');
});

// 发送验证码
router.post('/send-code', async (req, res) => {
  const { email } = req.body;
  const code = Math.random().toString().slice(-6);
  
  try {
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
router.post('/', function(req, res) {
  const { username, email, verifyCode } = req.body;
  
  const stored = verificationCodes.get(email);
  if (!stored || stored.expires < Date.now() || stored.code !== verifyCode) {
    return res.json({ success: false, message: '验证码无效或已过期' });
  }
  
  verificationCodes.delete(email);
  res.json({ success: true, message: '注册成功' });
});

module.exports = router;