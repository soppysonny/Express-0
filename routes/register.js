const express = require('express');
const router = express.Router();
const { sendVerificationCode } = require('../utils/email');
const { getTokenFromCookies } = require('../utils/auth');

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
  
  try {
    const stored = verificationCodes.get(email);
    if (!stored || stored.expires < Date.now() || stored.code !== verifyCode) {
      return res.json({ success: false, message: '验证码无效或已过期' });
    }

    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({ 
        email,
        token: stored.token
      });
    } else {
      user.token = stored.token;
    }
    
    user.save().catch(err => {
      console.error('保存用户失败:', err);
    });
    
    verificationCodes.delete(email);
    
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