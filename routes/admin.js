const express = require('express');
const router = express.Router();
const VpnRoute = require('../models/vpnRoute');
const User = require('../models/user');
const SubscriptionPlan = require('../models/subscriptionPlan');
const { encrypt, decrypt } = require('../utils/crypto');
const { loginLimiter, apiLimiter } = require('../middleware/rateLimit');
const axios = require('axios');

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

// Add logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout failed:', err);
      return res.json({ 
        success: false, 
        message: '退出失败'
      });
    }
    res.json({ success: true });
  });
});

// Get all subscription plans
router.get('/subscription-plans', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.json({ success: true, data: plans });
  } catch (err) {
    console.error('获取套餐列表失败:', err);
    res.json({ success: false, message: '获取套餐列表失败' });
  }
});

// Create new plan
router.post('/subscription-plans', async (req, res) => {
  try {
    const plan = new SubscriptionPlan(req.body);
    await plan.save();
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('添加套餐失败:', err);
    res.json({ success: false, message: '添加套餐失败' });
  }
});

// Update plan
router.put('/subscription-plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json({ success: true, data: plan });
  } catch (err) {
    console.error('更新套餐失败:', err);
    res.json({ success: false, message: '更新套餐失败' });
  }
});

// Delete plan
router.delete('/subscription-plans/:id', async (req, res) => {
  try {
    await SubscriptionPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('删除套餐失败:', err);
    res.json({ success: false, message: '删除套餐失败' });
  }
});

// Get single subscription plan
router.get('/subscription-plans/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: '找不到该套餐'
      });
    }
    res.json({
      success: true,
      data: plan
    });
  } catch (err) {
    console.error('获取套餐信息失败:', err);
    res.status(500).json({
      success: false,
      message: '获取套餐信息失败'
    });
  }
});

// iOS receipt verification endpoints
const PRODUCTION_URL = 'https://buy.itunes.apple.com/verifyReceipt';
const SANDBOX_URL = 'https://sandbox.itunes.apple.com/verifyReceipt';

// Verify iOS receipt
router.post('/verify-receipt', async (req, res) => {
  try {
    const { receipt_data } = req.body;
    
    if (!receipt_data) {
      return res.json({
        success: false,
        message: '收据数据不能为空'
      });
    }

    // First try production environment
    let verificationResult = await verifyReceipt(receipt_data, PRODUCTION_URL);
    
    // If status is 21007, it's a sandbox receipt, try sandbox environment
    if (verificationResult.status === 21007) {
      verificationResult = await verifyReceipt(receipt_data, SANDBOX_URL);
    }

    // Process verification result
    const response = processVerificationResult(verificationResult);
    res.json(response);

  } catch (err) {
    console.error('Receipt verification failed:', err);
    res.json({
      success: false,
      message: '收据验证失败',
      error: err.message
    });
  }
});

// Helper function to verify receipt with Apple
async function verifyReceipt(receiptData, verifyUrl) {
  try {
    const response = await axios.post(verifyUrl, {
      'receipt-data': receiptData,
      'password': process.env.APPLE_SECRET || 'your-secret-here', // Your app-specific shared secret
    });
    
    return response.data;
  } catch (err) {
    throw new Error(`Apple verification failed: ${err.message}`);
  }
}

function safeParseDate(timestamp) {
  if (!timestamp) return null;
  try {
    const date = new Date(parseInt(timestamp));
    return date.getTime() ? date.toISOString() : null;
  } catch (err) {
    console.warn('Invalid timestamp:', timestamp);
    return null;
  }
}

function processVerificationResult(result) {
  // Status 0 indicates success
  if (result.status === 0) {
    const latestReceipt = result.latest_receipt_info?.[0];
    const pendingRenewal = result.pending_renewal_info?.[0];
    
    if (latestReceipt) {
      return {
        success: true,
        data: {
          // Basic transaction info
          environment: result.environment,
          status: result.status,
          transactionId: latestReceipt.transaction_id,
          originalTransactionId: latestReceipt.original_transaction_id,
          
          // Product details
          productId: latestReceipt.product_id,
          quantity: parseInt(latestReceipt.quantity) || 1,
          
          // Dates - using safe date parsing
          purchaseDate: safeParseDate(latestReceipt.purchase_date_ms),
          originalPurchaseDate: safeParseDate(latestReceipt.original_purchase_date_ms),
          expiresDate: safeParseDate(latestReceipt.expires_date_ms),
          receiptCreationDate: safeParseDate(result.receipt?.creation_date_ms),
          cancellationDate: safeParseDate(latestReceipt.cancellation_date_ms),
          
          // Subscription info
          isTrialPeriod: latestReceipt.is_trial_period === "true",
          isInIntroOfferPeriod: latestReceipt.is_in_intro_offer_period === "true",
          
          // Renewal info
          autoRenewStatus: pendingRenewal?.auto_renew_status === "1",
          autoRenewProductId: pendingRenewal?.auto_renew_product_id,
          priceConsentStatus: pendingRenewal?.price_consent_status === "1",
          
          // Receipt info
          latestReceipt: result.latest_receipt,
          bundleId: result.receipt?.bundle_id,
          applicationVersion: result.receipt?.application_version,
          cancellationReason: latestReceipt.cancellation_reason,
          
          // Offer details
          offerCodeRefName: latestReceipt.offer_code_ref_name,
          promotionalOfferId: latestReceipt.promotional_offer_id,
          webOrderLineItemId: latestReceipt.web_order_line_item_id
        }
      };
    }
  }
  
  // Handle different status codes
  const statusMessages = {
    21000: '收据格式不正确',
    21002: '收据数据不正确',
    21003: '收据未认证',
    21004: '共享密钥不匹配',
    21005: '收据服务器暂时不可用',
    21006: '收据已过期',
    21007: '收据来自测试环境',
    21008: '收据来自生产环境',
    21010: '收据数据无效',
    21100: 'IAP授权问题',
    21199: '内部数据访问错误'
  };

  return {
    success: false,
    message: statusMessages[result.status] || '未知错误',
    status: result.status,
    environment: result.environment
  };
}

module.exports = router;