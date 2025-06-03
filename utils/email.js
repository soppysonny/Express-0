const nodemailer = require('nodemailer');
const env = require('../config/env');

const AUTH_EMAIL = '1905810584@qq.com'; // QQ邮箱地址

// 创建邮件传输器
const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: AUTH_EMAIL,
    pass: 'ggpocfdjnwkzcfaa' // 授权码
  }
});

/**
 * 发送验证码邮件
 * @param {string} to 收件人邮箱
 * @param {string} code 验证码
 * @returns {Promise}
 */
async function sendVerificationCode(to, code) {
  // 邮件配置
  const mailOptions = {
    from: `"注册验证" <${AUTH_EMAIL}>`, // 确保发件人地址与认证用户一致
    to: to,
    subject: '注册验证码',
    html: `
      <div style="padding: 20px; background-color: #f5f5f5;">
        <h2>您的验证码是：</h2>
        <h1 style="color: #4285f4; font-size: 30px;">${code}</h1>
        <p>验证码10分钟内有效，请尽快使用。</p>
        ${env.isDev ? '<p style="color: #666;">开发环境测试邮件</p>' : ''}
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    if (env.isDev) {
      console.log('Message sent: %s', info.messageId);
    }
    return true;
  } catch (error) {
    if (env.isDev) {
      console.error('Send email failed:', error);
    }
    throw error;
  }
}

module.exports = {
  sendVerificationCode
};