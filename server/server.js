const express = require('express');
const cors = require('cors');
const path = require('path');
const svgCaptcha = require('svg-captcha');

const { initDb, getDb, saveDb } = require('./db/init');

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// 频率限制
const { rateLimitMiddleware } = require('./middleware/rateLimit');
app.use(rateLimitMiddleware);

// ==================== GET /api/captcha 验证码生成接口 ====================
const { setCaptcha } = require('./middleware/registerGuard');

app.get('/api/captcha', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  const captcha = svgCaptcha.create({
    size: 4,
    ignoreChars: '0o1iIlO',
    noise: 3,
    color: true,
    background: '#f0f0f0',
    width: 120,
    height: 40
  });
  // 存储验证码，关联IP，10分钟有效
  setCaptcha(ip, captcha.text.toLowerCase());
  res.type('svg');
  res.send(captcha.data);
});

// 静态文件服务（前端页面）
app.use(express.static(path.join(__dirname, '..')));

// API路由
app.use('/api/user', require('./routes/user'));
app.use('/api/name', require('./routes/name'));
app.use('/api/eval', require('./routes/name'));  // 复用name路由中的eval接口
app.use('/api/order', require('./routes/order'));
app.use('/api/biaowen', require('./routes/order'));  // 复用order路由中的biaowen接口
app.use('/api/admin', require('./routes/admin'));
app.use('/api/liuyao', require('./routes/liuyao'));
app.use('/api/paipan', require('./routes/paipan'));
app.use('/api/proxy', require('./routes/proxy'));  // AI 大模型代理接口

// 所有其他路由返回index.html（SPA支持）
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 异步启动：先初始化数据库，再启动服务
const config = require('./config');

async function startServer() {
  await initDb();

  // 定期保存数据库到文件（每30秒）
  setInterval(function() {
    try { saveDb(); } catch(e) {}
  }, 30000);

  // 进程退出时保存
  process.on('SIGINT', function() {
    try { saveDb(); } catch(e) {}
    process.exit(0);
  });
  process.on('SIGTERM', function() {
    try { saveDb(); } catch(e) {}
    process.exit(0);
  });

  app.listen(config.port, () => {
    console.log(`八字排盘API服务已启动: http://localhost:${config.port}`);
    console.log(`API文档: http://localhost:${config.port}/api`);
  });
}

startServer().catch(function(err) {
  console.error('服务启动失败:', err);
  process.exit(1);
});
