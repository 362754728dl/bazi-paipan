const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');

const router = express.Router();

// POST /api/proxy/ai - AI 大模型代理接口
// 前端不再直接调用第三方 AI API，统一通过此后端代理转发
router.post('/ai', async (req, res) => {
  try {
    // 统一配额检查
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, message: '未登录，请先登录后使用AI功能' });
    }

    let userId;
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwtSecret);
      userId = decoded.userId || decoded.id;
    } catch (e) {
      return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
    }

    // 查询用户会员状态和AI使用次数
    const db = getDb();
    const user = db.prepare('SELECT level, vip_expire_time, ai_used_today, ai_last_use_date FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }

    // 检查VIP是否过期
    let isVip = user.level === 'vip';
    if (isVip && user.vip_expire_time) {
      const now = new Date();
      const expire = new Date(user.vip_expire_time);
      if (now > expire) {
        db.prepare("UPDATE users SET level = 'normal', vip_expire_time = '', updated_at = datetime('now','localtime') WHERE id = ?").run(userId);
        isVip = false;
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    if (isVip) {
      // VIP：每天5次
      const dailyLimit = 5;
      // 按日期重置
      if (user.ai_last_use_date !== today) {
        db.prepare("UPDATE users SET ai_used_today = 0, ai_last_use_date = ? WHERE id = ?").run(today, userId);
        user.ai_used_today = 0;
      }
      if ((user.ai_used_today || 0) >= dailyLimit) {
        return res.status(429).json({
          code: 429,
          message: '您本日免费AI分析次数已用完，请明日再来。如需不限次使用，请添加站长微信办理会员（微信号在"我的"页面）。'
        });
      }
    } else {
      // 普通用户：终身1次
      const totalUsed = db.prepare("SELECT COUNT(*) as cnt FROM ai_use_logs WHERE user_id = ?").get(userId);
      if (!totalUsed) {
        // 表可能不存在，跳过检查
      } else if (totalUsed.cnt >= 1) {
        return res.status(429).json({
          code: 429,
          message: '您的免费AI分析体验次数已用完。如需继续使用，请添加站长微信办理会员（微信号在"我的"页面）。'
        });
      }
    }

    const { provider, messages, temperature, max_tokens } = req.body;

    // 获取指定 provider 的配置，未指定则使用默认
    const providerName = provider || config.ai.default;
    const aiConfig = config.ai[providerName];

    if (!aiConfig) {
      return res.json({ code: 400, message: '不支持的 AI 模型: ' + providerName });
    }

    if (!aiConfig.apiKey) {
      return res.json({ code: 500, message: 'AI 模型未配置 API Key' });
    }

    // 转发请求到第三方 AI 服务
    const fetchResponse = await fetch(aiConfig.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + aiConfig.apiKey
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: messages || [],
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 3000
      })
    });

    const data = await fetchResponse.json();

    // 记录AI调用次数
    if (isVip) {
      db.prepare("UPDATE users SET ai_used_today = ai_used_today + 1 WHERE id = ?").run(userId);
    } else {
      try {
        db.prepare("CREATE TABLE IF NOT EXISTS ai_use_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, created_at TEXT DEFAULT datetime('now','localtime'))").run();
        db.prepare("INSERT INTO ai_use_logs (user_id) VALUES (?)").run(userId);
      } catch(e) {}
    }

    // 直接将第三方 API 的响应返回给前端
    res.json(data);
  } catch (err) {
    console.error('AI 代理请求失败:', err);
    res.json({ code: 500, message: 'AI 服务请求失败: ' + (err.message || '未知错误') });
  }
});

module.exports = router;
