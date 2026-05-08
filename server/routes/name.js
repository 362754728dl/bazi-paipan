const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// 辅助函数：检查并更新每日次数
async function checkAndUpdateDailyCount(userId, type) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  // 检查VIP是否过期
  const user = await db.prepare('SELECT level, vip_expire_time FROM users WHERE id = ?').get(userId);
  let isVip = user.level === 'vip';
  if (isVip && user.vip_expire_time) {
    const now = new Date();
    const expire = new Date(user.vip_expire_time);
    if (now > expire) {
      await db.prepare('UPDATE users SET level = \'normal\', vip_expire_time = \'\', updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
        .run(userId);
      isVip = false;
    }
  }

  const limits = isVip ? config.vipLimits : config.freeLimits;
  const countField = type === 'name' ? 'name_count' : 'eval_count';
  const limitValue = type === 'name' ? limits.nameCount : limits.evalCount;

  // 获取或创建今日记录
  let record = await db.prepare(
    'SELECT id, name_count, eval_count FROM daily_counts WHERE user_id = ? AND date = ?'
  ).get(userId, today);

  if (!record) {
    const result = await db.prepare(
      'INSERT INTO daily_counts (user_id, date, name_count, eval_count) VALUES (?, ?, 0, 0)'
    ).run(userId, today);
    record = { id: result.lastInsertRowid, name_count: 0, eval_count: 0 };
  }

  const currentCount = record[countField];

  if (currentCount >= limitValue) {
    return { allowed: false, used: currentCount, limit: limitValue };
  }

  // 增加计数
  await db.prepare(
    `UPDATE daily_counts SET ${countField} = ${countField} + 1 WHERE id = ?`
  ).run(record.id);

  return { allowed: true, used: currentCount + 1, limit: limitValue };
}

// ==================== 新增：姓名评测缓存检查接口 ====================

// POST /api/name/check-cache - 检查姓名评测/取名是否有缓存（不扣次数）
router.post('/check-cache', authMiddleware, async (req, res) => {
  try {
    const { name, baziData, type } = req.body;
    const db = getDb();

    if (!name || !baziData) {
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    // baziData 统一为 JSON 字符串作为缓存 key 的一部分
    const baziKey = typeof baziData === 'string' ? baziData : JSON.stringify(baziData);

    // 在 name_evaluation_cache 表中查找缓存
    const cache = await db.prepare(
      'SELECT id, evaluation_result, created_at FROM name_evaluation_cache WHERE user_id = ? AND name = ? AND bazi_data = ?'
    ).get(req.user_id, name, baziKey);

    if (cache) {
      return res.json({
        code: 200,
        data: {
          cached: true,
          evaluation_result: cache.evaluation_result,
          cache_id: cache.id,
          created_at: cache.created_at
        },
        message: '命中缓存'
      });
    }

    return res.json({
      code: 200,
      data: { cached: false },
      message: '无缓存'
    });
  } catch (err) {
    console.error('缓存检查失败:', err);
    res.json({ code: 500, message: '缓存检查失败' });
  }
});

// POST /api/name/save-cache - 保存评测结果到缓存（调用AI后使用）
router.post('/save-cache', authMiddleware, async (req, res) => {
  try {
    const { name, baziData, evaluation_result, type } = req.body;
    const db = getDb();

    if (!name || !evaluation_result) {
      return res.json({ code: 400, message: '缺少必要参数' });
    }

    const baziKey = typeof baziData === 'string' ? baziData : JSON.stringify(baziData || '');
    const resultStr = typeof evaluation_result === 'string' ? evaluation_result : JSON.stringify(evaluation_result);

    // 使用 INSERT OR IGNORE 避免重复（UNIQUE 约束）
    const insertResult = await db.prepare(
      'INSERT OR IGNORE INTO name_evaluation_cache (user_id, name, bazi_data, evaluation_result, created_at) VALUES (?, ?, ?, ?, strftime(\'%s\',\'now\'))'
    ).run(req.user_id, name, baziKey, resultStr);

    if (insertResult.changes > 0) {
      return res.json({
        code: 200,
        data: { cache_id: insertResult.lastInsertRowid },
        message: '缓存保存成功'
      });
    }

    // 已存在缓存，返回已有的
    const existing = await db.prepare(
      'SELECT id, evaluation_result FROM name_evaluation_cache WHERE user_id = ? AND name = ? AND bazi_data = ?'
    ).get(req.user_id, name, baziKey);

    return res.json({
      code: 200,
      data: { cache_id: existing.id, already_exists: true },
      message: '缓存已存在'
    });
  } catch (err) {
    console.error('缓存保存失败:', err);
    res.json({ code: 500, message: '缓存保存失败' });
  }
});

// ==================== 原有接口保持不变 ====================

// POST /api/name/generate（需登录）
router.post('/generate', authMiddleware, async (req, res) => {
  try {
    const { surname, gender, birthday, birthplace, style, baziData, result } = req.body;
    const db = getDb();

    if (!surname) {
      return res.json({ code: 400, message: '姓氏不能为空' });
    }

    // 检查新的会员系统AI次数
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

    // 保存记录
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const stmt = db.prepare(
      'INSERT INTO name_records (user_id, surname, gender, birthday, birthplace, style, result) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    const insertResult = await stmt.run(
      req.user_id, surname, gender || '', birthday || '', birthplace || '', style || '', resultStr || ''
    );

    // 写入缓存表
    try {
      await db.prepare('INSERT OR REPLACE INTO name_cache (surname, birthday, birthplace, style, result, created_at) VALUES (?, ?, ?, ?, ?, datetime(\'now\',\'localtime\'))').run(
        surname, birthday, birthplace || null, style || '', resultStr || ''
      );
    } catch(e) {}

    res.json({
      code: 200,
      data: { id: insertResult.lastInsertRowid },
      message: '取名记录已保存'
    });
  } catch (err) {
    console.error('取名保存失败:', err);
    res.json({ code: 500, message: '取名保存失败' });
  }
});

// GET /api/name/eval-cache - 查询评测缓存
router.get('/eval-cache', authMiddleware, async (req, res) => {
  try {
    const { name, birthday, birthplace } = req.query;
    if (!name || !birthday) {
      return res.json({ code: 400, message: '缺少查询参数' });
    }
    const db = getDb();
    const cache = await db.prepare(
      'SELECT result FROM eval_cache WHERE name = ? AND birthday = ? AND (birthplace = ? OR birthplace IS NULL) ORDER BY id DESC LIMIT 1'
    ).get(name, birthday, birthplace || null);
    if (cache) {
      return res.json({ code: 200, data: { cached: true, result: cache.result } });
    }
    return res.json({ code: 200, data: { cached: false } });
  } catch (err) {
    console.error('查询缓存失败:', err);
    res.json({ code: 500, message: '查询缓存失败' });
  }
});

// GET /api/name/name-cache - 查询取名缓存
router.get('/name-cache', authMiddleware, async (req, res) => {
  try {
    const { surname, birthday, birthplace, style } = req.query;
    if (!surname || !birthday) {
      return res.json({ code: 400, message: '缺少查询参数' });
    }
    const db = getDb();
    const cache = await db.prepare(
      'SELECT result FROM name_cache WHERE surname = ? AND birthday = ? AND style = ? AND (birthplace = ? OR birthplace IS NULL) ORDER BY id DESC LIMIT 1'
    ).get(surname, birthday, style || '', birthplace || null);
    if (cache) {
      return res.json({ code: 200, data: { cached: true, result: cache.result } });
    }
    return res.json({ code: 200, data: { cached: false } });
  } catch (err) {
    console.error('查询缓存失败:', err);
    res.json({ code: 500, message: '查询缓存失败' });
  }
});

// POST /api/name/evaluate（需登录）
router.post('/evaluate', authMiddleware, async (req, res) => {
  try {
    const { name, gender, birthday, birthplace, baziData, result } = req.body;
    const db = getDb();

    if (!name) {
      return res.json({ code: 400, message: '名字不能为空' });
    }

    // 检查新的会员系统AI次数
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

    // 保存记录
    const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
    const stmt = db.prepare(
      'INSERT INTO eval_records (user_id, name, gender, birthday, birthplace, result) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const insertResult = await stmt.run(
      req.user_id, name, gender || '', birthday || '', birthplace || '', resultStr || ''
    );

    // 写入缓存表
    try {
      await db.prepare('INSERT OR REPLACE INTO eval_cache (name, birthday, birthplace, result, created_at) VALUES (?, ?, ?, ?, datetime(\'now\',\'localtime\'))').run(
        name, birthday, birthplace || null, resultStr || ''
      );
    } catch(e) {}

    res.json({
      code: 200,
      data: { id: insertResult.lastInsertRowid },
      message: '评测记录已保存'
    });
  } catch (err) {
    console.error('评测保存失败:', err);
    res.json({ code: 500, message: '评测保存失败' });
  }
});

// GET /api/name/records（需登录）
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const total = (await db.prepare('SELECT COUNT(*) as count FROM name_records WHERE user_id = ?')
      .get(req.user_id)).count;

    const records = await db.prepare(
      'SELECT id, surname, gender, birthday, birthplace, style, result, created_at FROM name_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(req.user_id, pageSize, offset);

    res.json({
      code: 200,
      data: {
        list: records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取取名记录失败:', err);
    res.json({ code: 500, message: '获取取名记录失败' });
  }
});

// GET /api/eval/records（需登录）
router.get('/eval-records', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;

    const total = (await db.prepare('SELECT COUNT(*) as count FROM eval_records WHERE user_id = ?')
      .get(req.user_id)).count;

    const records = await db.prepare(
      'SELECT id, name, gender, birthday, birthplace, result, created_at FROM eval_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(req.user_id, pageSize, offset);

    res.json({
      code: 200,
      data: {
        list: records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取评测记录失败:', err);
    res.json({ code: 500, message: '获取评测记录失败' });
  }
});

module.exports = router;
