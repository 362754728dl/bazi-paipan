const jwt = require('jsonwebtoken');
const config = require('../config');

function authMiddleware(req, res, next) {
  // ==================== 强制认证中间件（重写版） ====================
  console.log('[认证中间件] 收到请求，Cookie存在:', !!req.cookies?.auth_token, 'URL:', req.url);
  console.log('[认证中间件] 路径:', req.path);
  console.log('[认证中间件] cookies:', JSON.stringify(req.cookies));
  console.log('[认证中间件] auth_token:', req.cookies?.auth_token ? '存在(长度:' + req.cookies.auth_token.length + ')' : '不存在');

  let token = null;
  let tokenSource = '';

  // 1. 强制优先从 Cookie 读取 token
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
    tokenSource = 'cookie';
    console.log('[认证中间件] 从 Cookie 获取 token');
  }

  // 2. Cookie 找不到，再从 Authorization header 读取
  if (!token && req.headers.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
      tokenSource = 'header';
      console.log('[认证中间件] 从 Authorization Header 获取 token');
    }
  }

  // 3. 仍然没有 token，返回 401
  if (!token) {
    console.log('[认证中间件] 失败：未找到 auth_token (Cookie 和 Header 都不存在)');
    return res.status(401).json({ code: 401, message: '未登录' });
  }

  // 4. 验证 token
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user_id = decoded.user_id;
    req.username = decoded.username;
    req.user_level = decoded.level;
    console.log('[认证中间件] 成功：用户', decoded.username, '来源:', tokenSource);
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
