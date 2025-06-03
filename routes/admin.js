const express = require('express');
const router = express.Router();
const VpnRoute = require('../models/vpnRoute');
const User = require('../models/user');
const AdminLogin = require('../models/adminLogin');

const ADMIN_PASSWORD = '4558916482zm';
const LOGIN_TIMEOUT = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;

// Admin middleware
const checkAdmin = async (req, res, next) => {
  if (!req.session.isAdmin) {
    return res.redirect('/admin/login');
  }
  next();
};

// Login page
router.get('/login', (req, res) => {
  res.render('admin/login');
});

// Handle login
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const ip = req.ip;

  try {
    let loginAttempt = await AdminLogin.findOne({ ip });
    
    if (loginAttempt) {
      const timeDiff = Date.now() - loginAttempt.lastAttempt;
      if (timeDiff < LOGIN_TIMEOUT && loginAttempt.attempts >= MAX_ATTEMPTS) {
        return res.json({ 
          success: false, 
          message: '登录尝试次数过多，请稍后再试'
        });
      }
    } else {
      loginAttempt = new AdminLogin({ ip, attempts: 0 });
    }

    if (password !== ADMIN_PASSWORD) {
      loginAttempt.attempts += 1;
      loginAttempt.lastAttempt = Date.now();
      await loginAttempt.save();
      return res.json({ 
        success: false, 
        message: '密码错误'
      });
    }

    // Login successful
    req.session.isAdmin = true;
    loginAttempt.attempts = 0;
    await loginAttempt.save();
    
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, message: '服务器错误' });
  }
});

// Admin dashboard
router.get('/', checkAdmin, (req, res) => {
  res.render('admin/dashboard');
});

// Get VPN routes
router.get('/vpn-routes', checkAdmin, async (req, res) => {
  try {
    const routes = await VpnRoute.find();
    res.json({ success: true, data: routes });
  } catch (err) {
    res.json({ success: false, message: '获取线路列表失败' });
  }
});

// Get users
router.get('/users', checkAdmin, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, data: users });
  } catch (err) {
    res.json({ success: false, message: '获取用户列表失败' });
  }
});

module.exports = router;