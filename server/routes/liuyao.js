const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');

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
async function buildAiPrompt(hexData) {
  const h = hexData;
  // 构建六爻信息表
  let yaoInfo = '';
  if (h.lines && h.lines.length === 6) {
    const labels = ['初爻','二爻','三爻','四爻','五爻','上爻'];
    yaoInfo = h.lines.map((y, i) => {
      let s = `${labels[i]}：${y.yaoType}（${y.isYang ? '阳' : '阴'}${y.isDong ? '动' : '静'}）`;
      s += ` | 纳甲：${y.gan}${y.zhi}（${y.wuXing}）`;
      s += ` | 六亲：${y.liuQin} | 六神：${y.liuShen}`;
      if (i === h.shiIndex) s += ' | ★世爻';
      if (i === h.yingIndex) s += ' | ☆应爻';
      return s;
    }).join('\n');
  }

  // 构建动爻信息
  let dongInfo = '';
  if (h.lines) {
    h.lines.forEach((y, i) => {
      if (y.isDong) {
        const labels = ['初','二','三','四','五','上'];
        dongInfo += `${labels[i]}爻动（${y.yaoType}） `;
      }
    });
  }

  return `请对以下六爻卦象进行深度专业分析：

【基本信息】
- 所占事项：${h.matter || '未指定'}
- 起卦时间：${h.guaTime ? new Date(h.guaTime).toLocaleString('zh-CN') : '未知'}
- 农历日期：${h.lunarDate || '未知'}
- 四柱干支：${h.yearGZ?.ganZhi || '?'}年 ${h.monthGZ?.ganZhi || '?'}月 ${h.dayGZ?.ganZhi || '?'}日 ${h.hourGZ?.ganZhi || '?'}时
- 节气：${h.solarTerm || '未知'}
- 空亡：${h.kongWang || '未知'}

【卦象信息】
- 本卦：${h.name || '未知'}（${h.palace || '?'}宫）
- 变卦：${h.changedName || '未知'}（${h.changedPalace || '?'}宫）
- 卦身：${h.guaShen || '未知'}
- 驿马：${h.yiMa || '未知'} | 桃花：${h.taoHua || '未知'} | 日禄：${h.riLu || '未知'} | 华盖：${h.huaGai || '未知'}

【六爻详情】
${yaoInfo}

【动爻】${dongInfo || '无动爻'}
【世应】世爻：${h.shiShiQin || '?'}（第${(h.shiIndex ?? -1) + 1}爻） | 应爻位置：第${(h.yingIndex ?? -1) + 1}爻
【伏神】${h.fuShen || '无'}

请严格按照以下6个维度进行深度分析，每个维度都必须详细展开：

一、【卦象核心解读】
结合本卦、变卦的卦名、卦象、卦辞，解读整体卦象含义及其对所占事项的启示。

二、【用神定位】
根据所占事项确定用神（如问财运取妻财，问事业取官鬼，问婚姻看男女分别取用），分析用神在卦中的位置、旺衰及其对结果的影响。

三、【旺衰分析】
结合月建、日辰对用神、世爻、动爻的生克关系，分析各方力量的旺衰对比。

四、【事件成败概率】
综合以上分析，给出明确的成功概率（百分比），并说明判断依据。

五、【行动建议】
根据卦象分析结果，给出3-5条具体可行的行动建议。

六、【应期参考】
根据动爻、用神与日辰月建的关系，推测可能应验的时间范围。

注意：
1. 分析必须严格基于上述卦象数据，不可泛泛而谈
2. 语言专业但不晦涩，让普通用户也能理解
3. 如有动爻，必须重点分析动爻的变爻对结果的影响
4. 成功概率必须给出明确的百分比数字`;
}

// ========== 次数检查（不扣次数，仅查询） ==========
async function getLiuyaoCountInfo(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const user = await db.prepare('SELECT level, vip_expire_time FROM users WHERE id = ?').get(userId);
  let isVip = user.level === 'vip';
  if (isVip && user.vip_expire_time) {
    const now = new Date();
    const expire = new Date(user.vip_expire_time);
    if (now > expire) {
      await db.prepare("UPDATE users SET level = 'normal', vip_expire_time = '', updated_at = datetime('now','localtime') WHERE id = ?").run(userId);
      isVip = false;
    }
  }

  if (isVip) {
    // VIP用户：每天5次，按日期重置
    const limitValue = config.vipLimits.liuyaoCount;
    let record = await db.prepare(
      'SELECT liuyao_count FROM daily_counts WHERE user_id = ? AND date = ?'
    ).get(userId, today);
    const used = record ? record.liuyao_count : 0;
    return { used, limit: limitValue, remaining: Math.max(0, limitValue - used), is_vip: true };
  } else {
    // 普通用户：累计终身1次（不按日期重置）
    const limitValue = config.freeLimits.liuyaoCount;
    const totalUsed = (await db.prepare('SELECT COUNT(*) as cnt FROM liuyao_ai_records WHERE user_id = ?').get(userId)).cnt;
    return { used: totalUsed, limit: limitValue, remaining: Math.max(0, limitValue - totalUsed), is_vip: false };
  }
}

// ========== 次数检查并扣减 ==========
async function checkAndDeductLiuyaoCount(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const user = await db.prepare('SELECT level, vip_expire_time FROM users WHERE id = ?').get(userId);
  let isVip = user.level === 'vip';
  if (isVip && user.vip_expire_time) {
    const now = new Date();
    const expire = new Date(user.vip_expire_time);
    if (now > expire) {
      await db.prepare("UPDATE users SET level = 'normal', vip_expire_time = '', updated_at = datetime('now','localtime') WHERE id = ?").run(userId);
      isVip = false;
    }
  }

  if (isVip) {
    // VIP用户：每天5次，按日期重置
    const limitValue = config.vipLimits.liuyaoCount;
    let record = await db.prepare(
      'SELECT id, liuyao_count FROM daily_counts WHERE user_id = ? AND date = ?'
    ).get(userId, today);

    if (!record) {
      const result = await db.prepare(
        'INSERT INTO daily_counts (user_id, date, name_count, eval_count, liuyao_count) VALUES (?, ?, 0, 0, 0)'
      ).run(userId, today);
      record = { id: result.lastInsertRowid, liuyao_count: 0 };
    }

    if (record.liuyao_count >= limitValue) {
      return { allowed: false, used: record.liuyao_count, limit: limitValue, is_vip: true };
    }

    await db.prepare('UPDATE daily_counts SET liuyao_count = liuyao_count + 1 WHERE id = ?').run(record.id);
    return { allowed: true, used: record.liuyao_count + 1, limit: limitValue, is_vip: true };
  } else {
    // 普通用户：累计终身1次
    const limitValue = config.freeLimits.liuyaoCount;
    const totalUsed = (await db.prepare('SELECT COUNT(*) as cnt FROM liuyao_ai_records WHERE user_id = ?').get(userId)).cnt;

    if (totalUsed >= limitValue) {
      return { allowed: false, used: totalUsed, limit: limitValue, is_vip: false };
    }

    // 不需要在daily_counts中记录，因为普通用户是累计的
    // 次数在AI分析成功后通过liuyao_ai_records表自动累计
    return { allowed: true, used: totalUsed + 1, limit: limitValue, is_vip: false };
  }
}

// ========== API路由 ==========

// GET /api/liuyao/count - 查询今日六爻AI分析剩余次数
router.get('/count', authMiddleware, async (req, res) => {
  try {
    const info = await getLiuyaoCountInfo(req.user_id);
    res.json({ code: 200, data: info });
  } catch (err) {
    console.error('查询六爻次数失败:', err);
    res.json({ code: 500, message: '查询次数失败' });
  }
});

// GET /api/liuyao/ai-cache - 查询六爻AI分析缓存
router.get('/ai-cache', authMiddleware, async (req, res) => {
  try {
    const { hex_binary, matter } = req.query;
    if (!hex_binary) {
      return res.json({ code: 400, message: '缺少卦象参数' });
    }
    const db = getDb();
    const cache = await db.prepare(
      "SELECT result FROM liuyao_ai_cache WHERE hex_binary = ? AND (matter = ? OR matter IS NULL OR matter = '') ORDER BY id DESC LIMIT 1"
    ).get(hex_binary, matter || '');
    if (cache) {
      return res.json({ code: 200, data: { cached: true, result: cache.result } });
    }
    return res.json({ code: 200, data: { cached: false } });
  } catch (err) {
    console.error('查询六爻缓存失败:', err);
    res.json({ code: 500, message: '查询缓存失败' });
  }
});

// POST /api/liuyao/ai-analyze - 六爻AI分析（需登录，先查缓存，缓存命中不扣次数）
router.post('/ai-analyze', authMiddleware, async (req, res) => {
  try {
    const { hex_binary, hex_name, matter, hex_data } = req.body;
    const db = getDb();

    if (!hex_binary) {
      return res.json({ code: 400, message: '卦象数据不能为空' });
    }

    // 1. 先查缓存（缓存命中不扣次数）
    const cache = await db.prepare(
      "SELECT result FROM liuyao_ai_cache WHERE hex_binary = ? AND (matter = ? OR matter IS NULL OR matter = '') ORDER BY id DESC LIMIT 1"
    ).get(hex_binary, matter || '');

    if (cache) {
      // 缓存命中，直接返回，不扣次数
      return res.json({
        code: 200,
        data: { cached: true, result: cache.result },
        message: '分析完成（缓存）'
      });
    }

    // 2. 缓存未命中，检查新的会员系统AI次数
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
    let hexDataObj = hex_data;
    if (typeof hex_data === 'string') {
      try { hexDataObj = JSON.parse(hex_data); } catch(e) { hexDataObj = {}; }
    }
    hexDataObj.matter = matter || hexDataObj.matter || '未指定';

    const prompt = buildAiPrompt(hexDataObj);
    const systemPrompt = '你是一位精通中国传统六爻占卜的命理大师，拥有深厚的易学功底。你的分析必须严格基于用户提供的卦象数据，结合六亲、世应、动爻、旺衰等进行深度解读。回答必须条理清晰、专业严谨。';
    let aiResult;
    try {
      aiResult = await callDeepSeek(systemPrompt, prompt);
    } catch (aiErr) {
      // AI调用失败，退还次数
      try {
        const dbRefund = getDb();
        const today = new Date().toISOString().slice(0, 10);
        await dbRefund.prepare(
          "UPDATE users SET ai_used_today = MAX(0, ai_used_today - 1) WHERE id = ? AND ai_last_use_date = ?"
        ).run(req.user_id, today);
      } catch(e) {}
      console.error('DeepSeek调用失败:', aiErr.message);
      return res.json({ code: 500, message: 'AI分析服务暂时不可用，请稍后重试' });
    }

    // 4. 拼接合规声明
    const disclaimer = '\n\n---\n⚠️ **声明**：本分析基于传统六爻理论，仅供民俗文化参考，不构成任何决策建议。请理性看待，切勿迷信。';
    const fullResult = aiResult + disclaimer;

    // 5. 保存记录
    const resultStr = fullResult;
    await db.prepare(
      'INSERT INTO liuyao_ai_records (user_id, hex_binary, hex_name, matter, result) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user_id, hex_binary, hex_name || '', matter || '', resultStr);

    // 6. 写入缓存
    try {
      await db.prepare(
        "INSERT OR REPLACE INTO liuyao_ai_cache (hex_binary, matter, result, created_at) VALUES (?, ?, ?, datetime('now','localtime'))"
      ).run(hex_binary, matter || '', resultStr);
    } catch(e) {}

    res.json({
      code: 200,
      data: { cached: false, result: fullResult },
      message: '分析完成'
    });
  } catch (err) {
    console.error('六爻AI分析失败:', err);
    res.json({ code: 500, message: '六爻分析失败' });
  }
});

// GET /api/liuyao/records - 获取六爻AI分析记录（需登录）
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const total = (await db.prepare('SELECT COUNT(*) as count FROM liuyao_ai_records WHERE user_id = ?')
      .get(req.user_id)).count;

    const records = await db.prepare(
      'SELECT id, hex_binary, hex_name, matter, result, created_at FROM liuyao_ai_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(req.user_id, pageSize, offset);

    res.json({
      code: 200,
      data: { list: records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      message: 'success'
    });
  } catch (err) {
    console.error('获取六爻记录失败:', err);
    res.json({ code: 500, message: '获取六爻记录失败' });
  }
});

// POST /api/liuyao/save - 保存六爻摇卦记录（需登录）
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { gua_name, matter, hex_data, gua_time } = req.body;
    const db = getDb();

    if (!gua_name) {
      return res.json({ code: 400, message: '卦名不能为空' });
    }

    await db.prepare(
      'INSERT INTO liuyao_records (user_id, gua_name, matter, hex_data, gua_time) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user_id, gua_name || '', matter || '', hex_data ? JSON.stringify(hex_data) : '', gua_time || null);

    res.json({ code: 200, message: '保存成功' });
  } catch (err) {
    console.error('保存六爻记录失败:', err);
    res.json({ code: 500, message: '保存失败' });
  }
});

// GET /api/liuyao/list - 获取六爻摇卦记录列表（需登录）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const total = (await db.prepare('SELECT COUNT(*) as count FROM liuyao_records WHERE user_id = ?')
      .get(req.user_id)).count;

    const records = await db.prepare(
      'SELECT id, gua_name, matter, hex_data, gua_time, created_at FROM liuyao_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(req.user_id, pageSize, offset);

    res.json({
      code: 200,
      data: { list: records, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      message: 'success'
    });
  } catch (err) {
    console.error('获取六爻记录列表失败:', err);
    res.json({ code: 500, message: '获取记录失败' });
  }
});

module.exports = router;
