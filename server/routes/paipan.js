const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// POST /api/paipan/save - 保存排盘记录（需登录）
router.post('/save', authMiddleware, async (req, res) => {
  try {
    const { name, solarDate, lunarDate, gender, shengXiao, baziStr, formData } = req.body;
    const db = getDb();

    const formDataStr = typeof formData === 'string' ? formData : JSON.stringify(formData || {});

    const stmt = db.prepare(
      'INSERT INTO paipan_records (user_id, name, solar_date, lunar_date, gender, sheng_xiao, bazi_str, form_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const result = await stmt.run(
      req.user_id,
      name || '',
      solarDate || '',
      lunarDate || '',
      gender !== undefined ? gender : 1,
      shengXiao || '',
      baziStr || '',
      formDataStr
    );

    const record = await db.prepare('SELECT * FROM paipan_records WHERE id = ?').get(result.lastInsertRowid);

    res.json({
      code: 200,
      data: record,
      message: '排盘记录已保存'
    });
  } catch (err) {
    console.error('保存排盘记录失败:', err);
    res.json({ code: 500, message: '保存排盘记录失败' });
  }
});

// GET /api/paipan/records - 获取排盘记录列表（需登录，分页）
router.get('/records', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const total = (await db.prepare('SELECT COUNT(*) as count FROM paipan_records WHERE user_id = ?')
      .get(req.user_id)).count;

    const records = await db.prepare(
      'SELECT id, name, solar_date, lunar_date, gender, sheng_xiao, bazi_str, form_data, created_at FROM paipan_records WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?'
    ).all(req.user_id, pageSize, offset);

    res.json({
      code: 200,
      data: {
        list: records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page < Math.ceil(total / pageSize)
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取排盘记录失败:', err);
    res.json({ code: 500, message: '获取排盘记录失败' });
  }
});

// DELETE /api/paipan/record/:id - 删除排盘记录（需登录，仅限自己的记录）
router.delete('/record/:id', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const recordId = req.params.id;

    // 先检查记录是否存在且属于当前用户
    const record = await db.prepare('SELECT id, user_id FROM paipan_records WHERE id = ?').get(recordId);
    if (!record) {
      return res.json({ code: 404, message: '记录不存在' });
    }
    if (record.user_id !== req.user_id) {
      return res.json({ code: 403, message: '无权删除此记录' });
    }

    await db.prepare('DELETE FROM paipan_records WHERE id = ?').run(recordId);

    res.json({
      code: 200,
      data: null,
      message: '记录已删除'
    });
  } catch (err) {
    console.error('删除排盘记录失败:', err);
    res.json({ code: 500, message: '删除排盘记录失败' });
  }
});

// POST /api/paipan/records - 保存排盘记录
router.post('/records', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const userId = req.user.user_id;
    const { name, gender, solar_date, lunar_date, bazi_str, sheng_xiao, form_data, birth_hour, birth_minute } = req.body;

    const result = await db.run(
      `INSERT INTO paipan_records (user_id, name, gender, solar_date, lunar_date, bazi_str, sheng_xiao, form_data, birth_hour, birth_minute)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, name, gender, solar_date, lunar_date, bazi_str, JSON.stringify(form_data || {}), birth_hour, birth_minute]
    );

    res.json({ code: 200, message: '保存成功', data: { id: result.lastID } });
  } catch (error) {
    console.error('[保存排盘记录] 失败:', error);
    res.json({ code: 500, message: '保存失败' });
  }
});

module.exports = router;
