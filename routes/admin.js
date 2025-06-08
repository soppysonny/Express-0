const express = require('express');
const router = express.Router();
const VpnRoute = require('../models/vpnRoute');
const User = require('../models/user');
const { encrypt, decrypt } = require('../utils/crypto');
const { loginLimiter, apiLimiter } = require('../middleware/rateLimit');

// Apply rate limiting only
router.use('/login', loginLimiter);
router.use(apiLimiter);

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin/login');
});

const loginAttempts = new Map();

// Admin password verification
router.post('/verify', async (req, res) => {
  const ip = req.socket.remoteAddress || '0.0.0.0';
  const now = Date.now();
  const lastAttempt = loginAttempts.get(ip);

  // Check if last attempt was within 1 minute
  if (lastAttempt && (now - lastAttempt < 60000)) {
    const waitTime = Math.ceil((60000 - (now - lastAttempt)) / 1000);
    return res.json({
      success: false,
      message: `请等待${waitTime}秒后重试`
    });
  }

  const { password } = req.body;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '4558916482zm';
  
  // Update attempt time regardless of success/failure
  loginAttempts.set(ip, now);

  if (password === ADMIN_PASSWORD) {
    // Set admin session
    req.session.isAdmin = true;
    req.session.cookie.maxAge = 60 * 60 * 1000; // 1 hour
    
    // Wait for session to be saved before responding
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    res.json({ success: true });
  } else {
    res.json({ 
      success: false, 
      message: '密码错误'
    });
  }
});

// Admin dashboard
router.get('/', (req, res) => {
  res.render('admin/dashboard');
});

// Get VPN routes
router.get('/vpn-routes', async (req, res) => {
  try {
    const routes = await VpnRoute.find();
    
    // Encrypt sensitive fields in each route
    const encryptedRoutes = routes.map(route => {
      const routeObj = route.toObject();
      return {
        _id: routeObj._id,
        ip: encrypt(routeObj.ip),
        port: encrypt(routeObj.port),
        alias: encrypt(routeObj.alias),
        password: encrypt(routeObj.password),
        encryptionMethod: encrypt(routeObj.encryptionMethod),
        extraInfo: encrypt(routeObj.extraInfo || '{}')
      };
    });

    res.json({ success: true, data: encryptedRoutes });
  } catch (err) {
    console.error('获取线路列表失败:', err);
    res.json({ success: false, message: '获取线路列表失败' });
  }
});

// Get single VPN route
router.get('/vpn-routes/:id', async (req, res) => {
  try {
    const route = await VpnRoute.findById(req.params.id);
    if (!route) {
      return res.json({ success: false, message: '线路不存在' });
    }
    res.json({ success: true, data: route });
  } catch (err) {
    console.error('Failed to get VPN route:', err);
    res.json({ success: false, message: '获取线路失败' });
  }
});

// Get users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().select('email token registerIp lastLoginIp createdAt');
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.json({ success: false, message: '获取用户列表失败' });
  }
});

// Add VPN route
router.post('/vpn-routes', async (req, res) => {
  try {
    const { ip, port, alias, password, encryptionMethod, extraInfo } = req.body;
    
    const vpnRoute = new VpnRoute({
      ip,
      port,
      alias,
      password,
      encryptionMethod,
      extraInfo: extraInfo || '{}'
    });
    
    await vpnRoute.save();
    res.json({ success: true, data: vpnRoute });
  } catch (err) {
    console.error('Failed to add VPN route:', err);
    res.json({ success: false, message: '添加线路失败' });
  }
});

// Update VPN route
router.put('/vpn-routes/:id', async (req, res) => {
  try {
    const route = await VpnRoute.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!route) {
      return res.json({ success: false, message: '线路不存在' });
    }
    res.json({ success: true, data: route });
  } catch (err) {
    console.error('Failed to update VPN route:', err);
    res.json({ success: false, message: '更新线路失败' });
  }
});

// Delete VPN route
router.delete('/vpn-routes/:id', async (req, res) => {
  try {
    const route = await VpnRoute.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.json({ success: false, message: '线路不存在' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to delete VPN route:', err);
    res.json({ success: false, message: '删除线路失败' });
  }
});

// Decrypt route data
router.post('/decrypt', async (req, res) => {
  try {
    const { data } = req.body;
    
    // Decrypt each field using server-side key
    const decrypted = {
      alias: decrypt(data.alias),
      ip: decrypt(data.ip), 
      port: decrypt(data.port),
      encryptionMethod: decrypt(data.encryptionMethod)
    };

    res.json({
      success: true,
      data: decrypted
    });
  } catch (err) {
    console.error('Decryption failed:', err);
    res.json({
      success: false,
      message: '解密失败'
    });
  }
});

module.exports = router;