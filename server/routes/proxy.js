const express = require('express');

const router = express.Router();

// POST /api/proxy/ai - AI 接口已下线
// 原有 AI 大模型代理转发逻辑已全部移除
router.post('/ai', async (req, res) => {
  res.json({ code: 410, message: 'AI 功能已下线，请使用纯前端分析功能' });
});

module.exports = router;
