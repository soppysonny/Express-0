const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');
const User = require('../models/user');
const crypto = require('crypto');

// 生成token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

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
  const { username, email, verifyCode } = req.body;
  
  try {
    // 验证验证码
    const stored = verificationCodes.get(email);
    if (!stored || stored.expires < Date.now() || stored.code !== verifyCode) {
      return res.json({ success: false, message: '验证码无效或已过期' });
    }

    // 查找用户
    let user = await User.findOne({ email });
    
    if (!user) {
      // 创建新用户
      user = new User({ 
        username, 
        email,
        token: stored.token
      });
    } else {
      // 更新已存在用户的token
      user.token = stored.token;
    }
    
    // 异步保存用户
    user.save().catch(err => {
      console.error('保存用户失败:', err);
    });
    
    // 清除验证码
    verificationCodes.delete(email);
    
    // 返回token给前端
    res.json({ 
      success: true, 
      message: '登录成功',
      token: stored.token
    });
  } catch (err) {
    console.error('操作失败:', err);
    res.json({ success: false, message: '操作失败，请稍后重试' });
  }
});

module.exports = router;