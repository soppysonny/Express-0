const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.render('music', { title: 'Music Player' });
});

module.exports = router;