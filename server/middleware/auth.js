const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  // 优先从 Authorization header 读取 token
  var token = (req.headers.authorization || '').replace('Bearer ', '');
  // 其次从 cookie 读取 token
  if (!token && req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  console.log('[认证中间件] URL:', req.url, '| cookie token:', !!req.cookies?.auth_token, '| header token:', !!(req.headers.authorization));

  if (!token) return res.status(401).json({ code: 401, message: '未登录' });
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user_id = decoded.user_id;
    req.username = decoded.username;
    req.user_level = decoded.level;
    next();
  } catch (e) {
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
