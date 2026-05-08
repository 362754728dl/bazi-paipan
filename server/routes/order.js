const express = require('express');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// POST /api/order/create（需登录）
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { type, amount } = req.body;
    const db = getDb();

    if (!type || !['vip', 'biaowen'].includes(type)) {
      return res.json({ code: 400, message: '订单类型无效' });
    }

    // 生成订单号
    const prefix = type === 'vip' ? 'VIP' : 'BW';
    const orderNo = prefix + Date.now();

    const orderAmount = amount || (type === 'vip' ? config.vipPrice : 0);

    const result = await db.prepare(
      'INSERT INTO orders (user_id, order_no, type, amount) VALUES (?, ?, ?, ?)'
    ).run(req.user_id, orderNo, type, orderAmount);

    const orderId = result.lastInsertRowid;

    // 如果是表文订单，同时创建 biaowen_orders 记录
    if (type === 'biaowen') {
      await db.prepare(
        'INSERT INTO biaowen_orders (order_id) VALUES (?)'
      ).run(orderId);
    }

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

    res.json({
      code: 200,
      data: order,
      message: '订单创建成功'
    });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.json({ code: 500, message: '创建订单失败' });
  }
});

// GET /api/order/list（需登录）
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const db = getDb();
    const { status } = req.query;

    let sql = 'SELECT * FROM orders WHERE user_id = ?';
    const params = [req.user_id];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY id DESC';

    const orders = await db.prepare(sql).all(...params);

    res.json({
      code: 200,
      data: orders,
      message: 'success'
    });
  } catch (err) {
    console.error('获取订单列表失败:', err);
    res.json({ code: 500, message: '获取订单列表失败' });
  }
});

// POST /api/order/pay-notify
router.post('/pay-notify', async (req, res) => {
  try {
    const { orderNo, status } = req.body;
    const db = getDb();

    if (!orderNo || !status) {
      return res.json({ code: 400, message: '参数不完整' });
    }

    const order = await db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
    if (!order) {
      return res.json({ code: 404, message: '订单不存在' });
    }

    // 更新订单状态
    await db.prepare(
      'UPDATE orders SET status = ?, pay_time = datetime(\'now\',\'localtime\') WHERE order_no = ?'
    ).run(status, orderNo);

    // 如果支付成功且是VIP订单，自动开通会员
    if (status === 'paid' && order.type === 'vip') {
      const user = await db.prepare('SELECT level, vip_expire_time, member_level, member_expire_time FROM users WHERE id = ?').get(order.user_id);
      const now = new Date();

      let newExpire;
      if (user.vip_expire_time && new Date(user.vip_expire_time) > now) {
        // VIP未过期，在现有到期时间上延长
        const current = new Date(user.vip_expire_time);
        newExpire = new Date(current.getTime() + config.vipDuration * 24 * 60 * 60 * 1000);
      } else {
        // 新开通或已过期
        newExpire = new Date(now.getTime() + config.vipDuration * 24 * 60 * 60 * 1000);
      }

      const expireStr = newExpire.toISOString().slice(0, 19).replace('T', ' ');
      // 同步更新原有VIP字段和新的会员系统字段
      const memberExpireTs = Math.floor(newExpire.getTime() / 1000);
      await db.prepare(
        "UPDATE users SET level = 'vip', vip_expire_time = ?, member_level = 1, member_expire_time = ?, updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(expireStr, memberExpireTs, order.user_id);
    }

    res.json({ code: 200, data: null, message: '支付通知处理成功' });
  } catch (err) {
    console.error('支付通知处理失败:', err);
    res.json({ code: 500, message: '支付通知处理失败' });
  }
});

// POST /api/biaowen/create（需登录）
router.post('/biaowen/create', authMiddleware, async (req, res) => {
  try {
    const { orderId, deceasedName, deceasedGender, address, familyMember, familyRank, remark } = req.body;
    const db = getDb();

    if (!orderId) {
      return res.json({ code: 400, message: '订单ID不能为空' });
    }

    // 验证订单属于当前用户
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(orderId, req.user_id);
    if (!order) {
      return res.json({ code: 404, message: '订单不存在' });
    }

    // 检查是否已有biaowen记录
    const existing = await db.prepare('SELECT id FROM biaowen_orders WHERE order_id = ?').get(orderId);

    if (existing) {
      // 更新
      await db.prepare(`
        UPDATE biaowen_orders SET
          deceased_name = ?, deceased_gender = ?, address = ?,
          family_member = ?, family_rank = ?, remark = ?
        WHERE order_id = ?
      `).run(
        deceasedName || '', deceasedGender || '', address || '',
        familyMember || '', familyRank || '', remark || '', orderId
      );
    } else {
      // 创建
      await db.prepare(`
        INSERT INTO biaowen_orders (order_id, deceased_name, deceased_gender, address, family_member, family_rank, remark)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        orderId, deceasedName || '', deceasedGender || '', address || '',
        familyMember || '', familyRank || '', remark || ''
      );
    }

    res.json({ code: 200, data: null, message: '表文信息保存成功' });
  } catch (err) {
    console.error('保存表文信息失败:', err);
    res.json({ code: 500, message: '保存表文信息失败' });
  }
});

module.exports = router;
