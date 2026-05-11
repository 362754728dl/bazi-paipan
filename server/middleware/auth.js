const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  // 只从 HttpOnly Cookie 读取 token
  console.log('[认证中间件] 收到请求，Cookie存在:', !!req.cookies?.auth_token, 'URL:', req.url);
  console.log('[认证中间件] 路径:', req.path);
  console.log('[认证中间件] cookies:', JSON.stringify(req.cookies));
  console.log('[认证中间件] auth_token:', req.cookies?.auth_token ? '存在(长度:' + req.cookies.auth_token.length + ')' : '不存在');

  const token = req.cookies?.auth_token;
  if (!token) {
    console.log('[认证中间件] 失败：auth_token 不存在');
    return res.status(401).json({ code: 401, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user_id = decoded.user_id;
    req.username = decoded.username;
    req.user_level = decoded.level;
    console.log('[认证中间件] 成功：用户', decoded.username);
    next();
  } catch (e) {
    console.log('[认证中间件] 失败：token 无效', e.message);
    return res.status(401).json({ code: 401, message: '登录已过期' });
  }
}

function adminAuthMiddleware(req, res, next) {
  authMiddleware(req, res, function() {
    if (req.username !== config.adminUser) {
      return res.status(403).json({ code: 403, message: '无管理员权限' });
    }
    next();
  });
}

module.exports = { authMiddleware, adminAuthMiddleware };
