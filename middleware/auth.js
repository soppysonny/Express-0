function checkAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(401).json({
      success: false,
      message: '需要管理员权限'
    });
  }
  next();
}

module.exports = {
  checkAdmin
};