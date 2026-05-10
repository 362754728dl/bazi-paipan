const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  // 优先从 HttpOnly Cookie 读取 token（安全改造后）
  // 兼容旧逻辑：同时支持 Authorization header（过渡期内）
  const token = req.cookies?.auth_token || req.headers.authorization?.replace('Bearer ', '');
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
