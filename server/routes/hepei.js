const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ========== DeepSeek AI 调用（通过 proxy 代理） ==========
async function callDeepSeek(systemPrompt, userPrompt) {
  const port = process.env.PORT || 3000;
  const resp = await fetch('http://localhost:' + port + '/api/proxy/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'deepseek',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0,
      max_tokens: 3000
    })
  });
  const data = await resp.json();
  if (data.error) {
    throw new Error('AI代理错误: ' + (data.error.message || JSON.stringify(data.error)));
  }
  return data.choices[0].message.content;
}

// ========== 构建AI提示词 ==========
async function buildAiPrompt(params) {
  const { nameA, genderA, baziA, strengthA, nameB, genderB, baziB, strengthB } = params;
  return `请对以下男女双方八字进行合配分析：

【甲方信息】
- 姓名：${nameA || '未提供'}
- 性别：${genderA === 'male' ? '男' : genderA === 'female' ? '女' : '未知'}
- 八字：${baziA || '未知'}
- 日元强弱：${strengthA || '未知'}

【乙方信息】
- 姓名：${nameB || '未提供'}
- 性别：${genderB === 'male' ? '男' : genderB === 'female' ? '女' : '未知'}
- 八字：${baziB || '未知'}
- 日元强弱：${strengthB || '未知'}

请严格按照以下4个维度进行深度分析，每个维度都必须详细展开：

一、【双方日元强弱与喜用神分析】
分别分析男女双方日元的旺衰、得令得地得势情况，推算各自的喜用神和忌神。

二、【五行互补与流通分析】
分析双方喜用神是否互补，五行之间是否形成良好的生克流通关系，是否存在五行失衡的隐患。

三、【合配禁忌分析】
重点分析传统命理中的合配禁忌，如男怕劫财、女怕伤官、羊刃冲合等，评估其对婚姻感情的影响程度。

四、【整体合配评分与建议】
综合以上分析，给出合配评分（百分制），并给出3-5条具体的相处建议。

注意：
1. 分析必须严格基于上述八字数据，不可泛泛而谈
2. 语言专业但不晦涩，让普通用户也能理解
3. 合配评分必须给出明确的百分比数字
4. 侧重五行平衡与互补逻辑，避免封建迷信表述`;
}

// ========== API路由 ==========

// POST /api/hepei/ai-analyze - 合配AI分析（需登录，先查缓存，缓存命中不扣次数）
router.post('/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const { nameA, genderA, baziA, strengthA, nameB, genderB, baziB, strengthB } = req.body;
    const db = getDb();

    if (!baziA || !baziB) {
      return res.json({ code: 400, message: '双方八字数据不能为空' });
    }

    // 1. 先查缓存（以 user_id + baziA + baziB 为唯一key，缓存命中不扣次数）
    const cache = db.prepare(
      'SELECT result FROM hepei_cache WHERE user_id = ? AND baziA = ? AND baziB = ? ORDER BY id DESC LIMIT 1'
    ).get(req.user_id, baziA, baziB);

    if (cache) {
      return res.json({
        code: 200,
        data: { cached: true, result: cache.result },
        message: '分析完成（缓存）'
      });
    }

    // 2. 缓存未命中，调用 /api/user/ai-use 检查并扣减AI次数
    const aiUseResp = await (await fetch('http://localhost:' + (process.env.PORT || 3000) + '/api/user/ai-use', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': req.headers.authorization }
    })).json();

    if (aiUseResp.code === 403) {
      return res.json({
        code: 403,
        message: aiUseResp.message,
        data: aiUseResp.data
      });
    }

    // 3. 调用DeepSeek AI
    const prompt = buildAiPrompt({ nameA, genderA, baziA, strengthA, nameB, genderB, baziB, strengthB });
    const systemPrompt = '你是专业的命理师，根据用户提供的男女双方八字，进行合配分析，重点包括：\n1.  双方日元强弱、喜用神分析\n2.  双方喜用神是否互补，五行流通情况\n3.  男怕劫财、女怕伤官等合配禁忌分析\n4.  整体合配评分与建议\n分析要专业、严谨，侧重五行平衡与互补逻辑，避免封建迷信表述';
    let aiResult;
    try {
      aiResult = await callDeepSeek(systemPrompt, prompt);
    } catch (aiErr) {
      // AI调用失败，退还次数
      try {
        const dbRefund = getDb();
        const today = new Date().toISOString().slice(0, 10);
        dbRefund.prepare(
          "UPDATE users SET ai_used_today = MAX(0, ai_used_today - 1) WHERE id = ? AND ai_last_use_date = ?"
        ).run(req.user_id, today);
      } catch(e) {}
      console.error('DeepSeek调用失败:', aiErr.message);
      return res.json({ code: 500, message: 'AI分析服务暂时不可用，请稍后重试' });
    }

    // 4. 拼接合规声明
    const disclaimer = '\n\n---\n⚠️ **声明**：本分析基于传统命理理论，仅供民俗文化参考，不构成任何决策建议。请理性看待，切勿迷信。';
    const fullResult = aiResult + disclaimer;

    // 5. 保存记录到 hepei_records
    db.prepare(
      'INSERT INTO hepei_records (user_id, nameA, genderA, baziA, strengthA, nameB, genderB, baziB, strengthB, result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.user_id, nameA || '', genderA || '', baziA, strengthA || '', nameB || '', genderB || '', baziB, strengthB || '', fullResult);

    // 6. 写入缓存到 hepei_cache
    try {
      db.prepare(
        "INSERT OR REPLACE INTO hepei_cache (user_id, baziA, baziB, result, created_at) VALUES (?, ?, ?, ?, datetime('now','localtime'))"
      ).run(req.user_id, baziA, baziB, fullResult);
    } catch(e) {}

    res.json({
      code: 200,
      data: { cached: false, result: fullResult },
      message: '分析完成'
    });
  } catch (err) {
    console.error('合配AI分析失败:', err);
    res.json({ code: 500, message: '合配分析失败' });
  }
});

// GET /api/hepei/records - 获取合配记录（需登录）
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const total = db.prepare('SELECT COUNT(*) as count FROM hepei_records WHERE user_id = ?')
      .get(req.user_id).count;

    const records = db.prepare(
      'SELECT id, nameA, genderA, baziA, strengthA, nameB, genderB, baziB, strengthB, result, created_at FROM hepei_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(req.user_id, pageSize, offset);

    res.json({
      code: 200,
      data: { list: records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      message: 'success'
    });
  } catch (err) {
    console.error('获取合配记录失败:', err);
    res.json({ code: 500, message: '获取合配记录失败' });
  }
});

// GET /api/hepei/cache - 查询合配缓存（需登录）
router.get('/cache', authMiddleware, async (req, res) => {
  try {
    const { baziA, baziB } = req.query;
    if (!baziA || !baziB) {
      return res.json({ code: 400, message: '缺少八字参数' });
    }
    const db = getDb();
    const cache = db.prepare(
      'SELECT result FROM hepei_cache WHERE user_id = ? AND baziA = ? AND baziB = ? ORDER BY id DESC LIMIT 1'
    ).get(req.user_id, baziA, baziB);
    if (cache) {
      return res.json({ code: 200, data: { cached: true, result: cache.result } });
    }
    return res.json({ code: 200, data: { cached: false } });
  } catch (err) {
    console.error('查询合配缓存失败:', err);
    res.json({ code: 500, message: '查询缓存失败' });
  }
});

module.exports = router;
