const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { adminAuthMiddleware } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const db = getDb();

    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.json({ code: 400, message: '用户名或密码错误' });
    }

    if (username !== config.adminUser) {
      return res.json({ code: 403, message: '无管理员权限' });
    }

    // 兼容旧数据库：可能使用 password 或 password_hash 字段
    var passwordHash = user.password_hash || user.password;
    const valid = bcrypt.compareSync(password, passwordHash);
    if (!valid) {
      return res.json({ code: 400, message: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { user_id: user.id, username: user.username, level: user.level },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      code: 200,
      data: { token, username: user.username },
      message: '登录成功'
    });
  } catch (err) {
    console.error('管理员登录失败:', err);
    res.json({ code: 500, message: '登录失败' });
  }
});

// GET /api/admin/users（需管理员登录）
router.get('/users', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const keyword = req.query.keyword || '';
    const offset = (page - 1) * pageSize;

    let countSql = 'SELECT COUNT(*) as count FROM users WHERE username != ?';
    let dataSql = 'SELECT id, username, email, phone, level, vip_expire_time, created_at, updated_at FROM users WHERE username != ?';
    const params = [config.adminUser];

    if (keyword) {
      countSql += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)';
      dataSql += ' AND (username LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const kw = '%' + keyword + '%';
      params.push(kw, kw, kw);
    }

    dataSql += ' ORDER BY id DESC LIMIT ? OFFSET ?';

    const total = db.prepare(countSql).get(...params).count;
    const dataParams = [...params, pageSize, offset];
    const users = db.prepare(dataSql).all(...dataParams);

    res.json({
      code: 200,
      data: {
        list: users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.json({ code: 500, message: '获取用户列表失败' });
  }
});

// PUT /api/admin/user/:id（需管理员登录）
router.put('/user/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { level, vip_expire_time } = req.body;
    const db = getDb();

    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    if (level) {
      if (!['normal', 'vip', 'disabled'].includes(level)) {
        return res.json({ code: 400, message: '无效的用户等级' });
      }
    }

    const updates = [];
    const values = [];

    if (level) {
      updates.push('level = ?');
      values.push(level);
    }
    if (vip_expire_time !== undefined) {
      updates.push('vip_expire_time = ?');
      values.push(vip_expire_time);
    }

    if (updates.length === 0) {
      return res.json({ code: 400, message: '没有要更新的字段' });
    }

    updates.push('updated_at = datetime(\'now\',\'localtime\')');
    values.push(id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    res.json({ code: 200, data: null, message: '用户信息更新成功' });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.json({ code: 500, message: '更新用户信息失败' });
  }
});

// GET /api/admin/orders（需管理员登录）
router.get('/orders', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10));
    const offset = (page - 1) * pageSize;
    const { status, type } = req.query;

    let countSql = 'SELECT COUNT(*) as count FROM orders o LEFT JOIN users u ON o.user_id = u.id';
    let dataSql = `
      SELECT o.*, u.username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
    `;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    if (type) {
      conditions.push('o.type = ?');
      params.push(type);
    }
    if (req.query.keyword) {
      conditions.push('(o.order_no LIKE ? OR u.username LIKE ?)');
      params.push('%' + req.query.keyword + '%', '%' + req.query.keyword + '%');
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      countSql += whereClause;
      dataSql += whereClause;
    }

    dataSql += ' ORDER BY o.id DESC LIMIT ? OFFSET ?';

    const total = db.prepare(countSql).get(...params).count;
    const dataParams = [...params, pageSize, offset];
    const orders = db.prepare(dataSql).all(...dataParams);

    res.json({
      code: 200,
      data: {
        list: orders,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取订单列表失败:', err);
    res.json({ code: 500, message: '获取订单列表失败' });
  }
});

// PUT /api/admin/order/:id（需管理员登录）
router.put('/order/:id', adminAuthMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status, tracking_no } = req.body;
    const db = getDb();

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) {
      return res.json({ code: 404, message: '订单不存在' });
    }

    const updates = [];
    const values = [];

    if (status) {
      if (!['pending', 'paid', 'cancelled', 'expired'].includes(status)) {
        return res.json({ code: 400, message: '无效的订单状态' });
      }
      updates.push('status = ?');
      values.push(status);

      // 如果状态改为已支付，记录支付时间
      if (status === 'paid') {
        updates.push('pay_time = datetime(\'now\',\'localtime\')');
      }
    }

    if (tracking_no !== undefined) {
      // tracking_no 属于 biaowen_orders 表，不更新 orders 表
    }

    if (updates.length === 0 && tracking_no === undefined) {
      return res.json({ code: 400, message: '没有要更新的字段' });
    }

    // 更新 orders 表
    if (updates.length > 0) {
      values.push(id);
      db.prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    // 如果支付成功且是VIP订单，自动开通会员
    if (status === 'paid' && order.type === 'vip') {
      const user = db.prepare('SELECT level, vip_expire_time FROM users WHERE id = ?').get(order.user_id);
      const now = new Date();

      let newExpire;
      if (user.vip_expire_time && new Date(user.vip_expire_time) > now) {
        const current = new Date(user.vip_expire_time);
        newExpire = new Date(current.getTime() + config.vipDuration * 24 * 60 * 60 * 1000);
      } else {
        newExpire = new Date(now.getTime() + config.vipDuration * 24 * 60 * 60 * 1000);
      }

      const expireStr = newExpire.toISOString().slice(0, 19).replace('T', ' ');
      db.prepare(
        'UPDATE users SET level = \'vip\', vip_expire_time = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?'
      ).run(expireStr, order.user_id);
    }

    // 如果是表文订单且有物流号，更新biaowen_orders
    if (tracking_no !== undefined && order.type === 'biaowen') {
      const bw = db.prepare('SELECT id FROM biaowen_orders WHERE order_id = ?').get(id);
      if (bw) {
        db.prepare('UPDATE biaowen_orders SET tracking_no = ? WHERE order_id = ?').run(tracking_no, id);
      } else {
        db.prepare('INSERT INTO biaowen_orders (order_id, tracking_no) VALUES (?, ?)').run(id, tracking_no);
      }
    }

    res.json({ code: 200, data: null, message: '订单更新成功' });
  } catch (err) {
    console.error('更新订单失败:', err);
    res.json({ code: 500, message: '更新订单失败' });
  }
});

// GET /api/admin/statistics（需管理员登录）
router.get('/statistics', adminAuthMiddleware, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10);

    // 今日新增用户
    const todayUsers = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?"
    ).get(today).count;

    // 今日订单数
    const todayOrders = db.prepare(
      "SELECT COUNT(*) as count FROM orders WHERE date(created_at) = ?"
    ).get(today).count;

    // 今日收入
    const todayRevenue = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE date(created_at) = ? AND status = 'paid'"
    ).get(today).total;

    // 总用户数
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    // 总订单数
    const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;

    // 总收入
    const totalRevenue = db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as total FROM orders WHERE status = 'paid'"
    ).get().total;

    res.json({
      code: 200,
      data: {
        todayUsers,
        todayOrders,
        todayRevenue: Number(todayRevenue.toFixed(2)),
        totalUsers,
        totalOrders,
        totalRevenue: Number(totalRevenue.toFixed(2))
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取统计数据失败:', err);
    res.json({ code: 500, message: '获取统计数据失败' });
  }
});

// GET /api/admin/settings（需管理员登录）
router.get('/settings', adminAuthMiddleware, (req, res) => {
  try {
    res.json({
      code: 200,
      data: {
        vip_price: config.vipPrice,
        vip_duration: config.vipDuration,
        free_name_count: config.freeLimits.nameCount,
        free_eval_count: config.freeLimits.evalCount,
        vip_name_count: config.vipLimits.nameCount,
        vip_eval_count: config.vipLimits.evalCount
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取系统设置失败:', err);
    res.json({ code: 500, message: '获取系统设置失败' });
  }
});

// PUT /api/admin/settings（需管理员登录）
router.put('/settings', adminAuthMiddleware, (req, res) => {
  try {
    const { vip_price, vip_duration, free_name_count, free_eval_count, vip_name_count, vip_eval_count, old_password, new_password } = req.body;
    const db = getDb();

    // 修改管理员密码
    if (old_password || new_password) {
      if (!old_password) {
        return res.json({ code: 400, message: '请输入旧密码' });
      }
      if (!new_password) {
        return res.json({ code: 400, message: '请输入新密码' });
      }
      if (new_password.length < 6) {
        return res.json({ code: 400, message: '新密码至少6位' });
      }

      const admin = db.prepare('SELECT * FROM users WHERE username = ?').get(config.adminUser);
      if (!admin) {
        return res.json({ code: 404, message: '管理员账号不存在' });
      }

      // 兼容旧数据库：可能使用 password 或 password_hash 字段
      var passwordHash = admin.password_hash || admin.password;
      const valid = require('bcryptjs').compareSync(old_password, passwordHash);
      if (!valid) {
        return res.json({ code: 400, message: '旧密码错误' });
      }

      const newHash = require('bcryptjs').hashSync(new_password, 10);
      db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\',\'localtime\') WHERE username = ?')
        .run(newHash, config.adminUser);
    }

    // 更新系统配置（写入数据库 settings 表）
    // 使用 JSON 文件存储配置
    const fs = require('fs');
    const path = require('path');
    const settingsPath = path.resolve(__dirname, '../data/settings.json');
    const settingsDir = path.dirname(settingsPath);

    // 读取现有设置
    let settings = {};
    try {
      if (fs.existsSync(settingsPath)) {
        settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      }
    } catch (e) {}

    // 更新设置
    if (vip_price !== undefined && vip_price > 0) settings.vip_price = vip_price;
    if (vip_duration !== undefined && vip_duration > 0) settings.vip_duration = vip_duration;
    if (free_name_count !== undefined && free_name_count >= 0) settings.free_name_count = free_name_count;
    if (free_eval_count !== undefined && free_eval_count >= 0) settings.free_eval_count = free_eval_count;
    if (vip_name_count !== undefined && vip_name_count >= 0) settings.vip_name_count = vip_name_count;
    if (vip_eval_count !== undefined && vip_eval_count >= 0) settings.vip_eval_count = vip_eval_count;

    // 确保目录存在
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    // 实时更新内存中的 config
    if (settings.vip_price) config.vipPrice = settings.vip_price;
    if (settings.vip_duration) config.vipDuration = settings.vip_duration;
    if (settings.free_name_count !== undefined) config.freeLimits.nameCount = settings.free_name_count;
    if (settings.free_eval_count !== undefined) config.freeLimits.evalCount = settings.free_eval_count;
    if (settings.vip_name_count !== undefined) config.vipLimits.nameCount = settings.vip_name_count;
    if (settings.vip_eval_count !== undefined) config.vipLimits.evalCount = settings.vip_eval_count;

    res.json({
      code: 200,
      data: null,
      message: '设置保存成功'
    });
  } catch (err) {
    console.error('保存系统设置失败:', err);
    res.json({ code: 500, message: '保存系统设置失败' });
  }
});

module.exports = router;
