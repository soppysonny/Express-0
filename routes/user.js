const express = require('express');
const router = express.Router();
const { getTokenFromCookies, verifyToken } = require('../utils/auth');
const User = require('../models/user');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 在文件顶部添加一个函数来确保目录存在
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`目录已创建: ${dirPath}`);
  }
}

// 配置 multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/logs');
    ensureDirectoryExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 使用用户ID和时间戳命名文件
    const timestamp = Date.now();
    const userId = req.user ? req.user._id : 'anonymous';
    const ext = path.extname(file.originalname);
    cb(null, `${userId}_${timestamp}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为 10MB
  },
  fileFilter: function (req, file, cb) {
    // 只允许文本文件和日志文件
    const allowedTypes = ['.txt', '.log', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传 .txt, .log, .json 格式的文件'));
    }
  }
});

// 用户身份验证中间件
const authenticateUser = async (req, res, next) => {
  try {
    const token = getTokenFromCookies(req.headers.cookie) || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供认证令牌'
      });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '无效的认证令牌'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('用户认证失败:', err);
    res.status(401).json({
      success: false,
      message: '认证失败'
    });
  }
};

// 获取当前用户信息
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-token');
    res.json({
      success: true,
      data: user
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({
      success: false,
      message: '获取用户信息失败'
    });
  }
});

// 更新用户信息
router.put('/profile', authenticateUser, async (req, res) => {
  try {
    const { email } = req.body;
    
    // 检查邮箱是否已被其他用户使用
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existingUser) {
        return res.json({
          success: false,
          message: '该邮箱已被其他用户使用'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { email },
      { new: true }
    ).select('-token');

    res.json({
      success: true,
      data: updatedUser,
      message: '用户信息更新成功'
    });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.status(500).json({
      success: false,
      message: '更新用户信息失败'
    });
  }
});

// 上传日志文件
router.post('/upload-log', authenticateUser, upload.single('logFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.json({
        success: false,
        message: '请选择要上传的日志文件'
      });
    }

    const { description, logType = 'general' } = req.body;

    // 创建日志记录（如果有日志模型的话）
    const logRecord = {
      userId: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filepath: req.file.path,
      size: req.file.size,
      description: description || '',
      logType: logType,
      uploadTime: new Date(),
      userEmail: req.user.email
    };

    // 可以保存到数据库（需要创建 LogFile 模型）
    // const savedLog = await LogFile.create(logRecord);

    console.log('用户上传日志:', logRecord);

    res.json({
      success: true,
      message: '日志文件上传成功',
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadTime: new Date()
      }
    });

  } catch (err) {
    console.error('上传日志文件失败:', err);
    res.status(500).json({
      success: false,
      message: '上传日志文件失败'
    });
  }
});

// 获取用户上传的日志列表
router.get('/logs', authenticateUser, async (req, res) => {
  try {
    const logsDir = 'uploads/logs';
    const userId = req.user._id.toString();

    if (!fs.existsSync(logsDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    // 读取日志目录，筛选当前用户的文件
    const files = fs.readdirSync(logsDir);
    const userFiles = files.filter(file => file.startsWith(userId + '_'));

    const logFiles = userFiles.map(filename => {
      const filepath = path.join(logsDir, filename);
      const stats = fs.statSync(filepath);
      
      return {
        filename,
        size: stats.size,
        uploadTime: stats.birthtime,
        modifiedTime: stats.mtime
      };
    });

    // 按上传时间倒序排序
    logFiles.sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));

    res.json({
      success: true,
      data: logFiles
    });

  } catch (err) {
    console.error('获取日志列表失败:', err);
    res.status(500).json({
      success: false,
      message: '获取日志列表失败'
    });
  }
});

// 删除日志文件
router.delete('/logs/:filename', authenticateUser, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user._id.toString();
    
    // 验证文件是否属于当前用户
    if (!filename.startsWith(userId + '_')) {
      return res.status(403).json({
        success: false,
        message: '无权删除此文件'
      });
    }

    const filepath = path.join('uploads/logs', filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({
        success: true,
        message: '日志文件删除成功'
      });
    } else {
      res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

  } catch (err) {
    console.error('删除日志文件失败:', err);
    res.status(500).json({
      success: false,
      message: '删除日志文件失败'
    });
  }
});

// 上传文本日志（直接发送文本内容）
router.post('/upload-text-log', authenticateUser, async (req, res) => {
  try {
    const { content, description, logType = 'text' } = req.body;

    if (!content) {
      return res.json({
        success: false,
        message: '日志内容不能为空'
      });
    }

    // 生成文件名
    const timestamp = Date.now();
    const userId = req.user._id;
    const filename = `${userId}_${timestamp}.txt`;
    const uploadDir = path.join(__dirname, '../uploads/logs');
    ensureDirectoryExists(uploadDir);
    
    const filepath = path.join(uploadDir, filename);
    
    // 写入文件
    fs.writeFileSync(filepath, content, 'utf8');

    const logRecord = {
      userId: req.user._id,
      filename: filename,
      filepath: filepath,
      size: Buffer.byteLength(content, 'utf8'),
      description: description || '',
      logType: logType,
      uploadTime: new Date(),
      userEmail: req.user.email
    };

    console.log('用户上传文本日志:', logRecord);

    res.json({
      success: true,
      message: '文本日志上传成功',
      data: {
        filename: filename,
        size: logRecord.size,
        uploadTime: new Date()
      }
    });

  } catch (err) {
    console.error('上传文本日志失败:', err);
    res.status(500).json({
      success: false,
      message: '上传文本日志失败'
    });
  }
});

// 获取用户订阅信息
router.get('/subscription', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('subscription');
    res.json({
      success: true,
      data: user.subscription || null
    });
  } catch (err) {
    console.error('获取订阅信息失败:', err);
    res.status(500).json({
      success: false,
      message: '获取订阅信息失败'
    });
  }
});

module.exports = router;