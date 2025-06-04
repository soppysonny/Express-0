const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { getTokenFromCookies } = require('../utils/auth');

/* GET home page. */
router.get('/', async function(req, res, next) {
  const token = getTokenFromCookies(req.headers.cookie);
  let user = null;

  if (token) {
    try {
      user = await User.findOne({ token });
      if (!user) {
        // 如果找不到用户，清除无效的 token
        res.clearCookie('token');
      }
    } catch (err) {
      console.error('Error finding user:', err);
    }
  }

  res.render('index', { 
    title: 'Express',
    user: user
  });
});

module.exports = router;
