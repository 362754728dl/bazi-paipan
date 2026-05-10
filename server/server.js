const express = require('express');
const cors = require('cors');
const path = require('path');
const svgCaptcha = require('svg-captcha');
const cookieParser = require('cookie-parser');

const { initDb, getDb, saveDb } = require('./db/init');

const app = express();

// CORS 配置：credentials: true 时，origin 必须是具体域名，不能是 * 或 true
app.use(cors({
  origin: function(origin, callback) {
    // 允许无 origin 的请求（如同站请求、移动端）
    if (!origin) return callback(null, true);
    // 允许所有来源（生产环境可限制为具体域名）
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

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

  const PORT = process.env.PORT || config.port || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`八字排盘API服务已启动: http://0.0.0.0:${PORT}`);
    console.log(`API文档: http://0.0.0.0:${PORT}/api`);

    // 会员到期自动降级定时任务（每小时检查一次）
    setInterval(async function() {
        try {
            const db = getDb();
            if (!db) return;

            const now = Math.floor(Date.now() / 1000);
            const result = await db.prepare(
                "UPDATE users SET member_level = 0, member_expire_time = 0, level = 'normal', ai_used_today = 0, ai_last_use_date = '', updated_at = datetime('now','localtime') WHERE member_level = 1 AND member_expire_time > 0 AND member_expire_time < ?"
            ).run(now);

            if (result.changes > 0) {
                console.log('[会员降级] 已自动降级 ' + result.changes + ' 个到期会员');
            }
        } catch (err) {
            console.error('[会员降级] 定时任务执行出错:', err.message);
        }
    }, 60 * 60 * 1000); // 每小时执行一次
  });
}

startServer().catch(function(err) {
  console.error('服务启动失败:', err);
  process.exit(1);
});
