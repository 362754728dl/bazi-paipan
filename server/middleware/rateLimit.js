// 简单的内存存储频率限制中间件
// 每个IP每分钟最多200次请求（API路由）
// 静态文件不计数

const requestCounts = new Map();

// 每60秒清理一次过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of requestCounts.entries()) {
    if (now - data.startTime >= 60000) {
      requestCounts.delete(key);
    }
  }
}, 60000);

function rateLimitMiddleware(req, res, next) {
  // 静态文件不限制
  if (!req.path.startsWith('/api/')) return next();

  // 获取客户端IP
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  let record = requestCounts.get(ip);

  if (!record || now - record.startTime >= 60000) {
    // 新的时间窗口
    requestCounts.set(ip, { count: 1, startTime: now });
    next();
  } else {
    record.count++;
    if (record.count > 200) {
      return res.status(429).json({
        code: 429,
        message: '请求过于频繁，请稍后再试'
      });
    }
    next();
  }
}

module.exports = { rateLimitMiddleware };
