const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/init');
const { authMiddleware } = require('../middleware/auth');
const { verifyCaptcha, checkRegisterRateLimit, recordRegisterSuccess } = require('../middleware/registerGuard');
const config = require('../config');

const router = express.Router();

// 生成JWT token
function generateToken(user) {
  return jwt.sign(
    { user_id: user.id, username: user.username, level: user.level },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// POST /api/user/register
router.post('/register', (req, res) => {
  try {
    const { username, password, captcha } = req.body;
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

    // 【防护层1】验证码校验
    if (!verifyCaptcha(ip, captcha)) {
      return res.json({ code: 400, message: '验证码错误，请重新输入' });
    }

    // 【防护层2】注册IP限流预检（仅统计成功，此处检查当前是否已达上限）
    const rateCheck = checkRegisterRateLimit(ip);
    if (!rateCheck.allowed) {
      return res.json({ code: 429, message: rateCheck.message });
    }

    const db = getDb();

    // 参数验证
    if (!username || !password) {
      return res.json({ code: 400, message: '用户名和密码不能为空' });
    }
    if (username.length < 2) {
      return res.json({ code: 400, message: '用户名至少2个字符' });
    }
    if (password.length < 6) {
      return res.json({ code: 400, message: '密码至少6位' });
    }

    // 检查用户名是否已存在
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.json({ code: 400, message: '用户名已存在' });
    }

    // 加密密码
    const passwordHash = bcrypt.hashSync(password, 10);

    // 插入用户
    const result = db.prepare(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)'
    ).run(username, passwordHash);

    const user = {
      id: result.lastInsertRowid,
      username,
      level: 'normal'
    };

    // 注册成功：记录IP限流
    recordRegisterSuccess(ip);

    const token = generateToken(user);

    // 设置 HttpOnly Cookie（Express内置res.cookie，无需cookie-parser）
    try {
      var isProduction = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    } catch (e) {
      console.error('设置Cookie失败:', e.message);
    }

    res.json({
      code: 200,
      data: { token, user_id: user.id, username: user.username, level: user.level },
      message: '注册成功'
    });
  } catch (err) {
    console.error('注册失败:', err);
    res.json({ code: 500, message: '注册失败' });
  }
});

// POST /api/user/login
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

    // 检查账号是否被禁用
    if (user.level === 'disabled') {
      return res.json({ code: 403, message: '账号已被禁用' });
    }

    // 兼容旧数据库：可能使用 password 或 password_hash 字段
    var passwordHash = user.password_hash || user.password;
    if (!passwordHash) {
      console.log('[登录] 用户', username, '没有密码字段');
      return res.json({ code: 400, message: '用户名或密码错误' });
    }
    const valid = bcrypt.compareSync(password, passwordHash);
    if (!valid) {
      return res.json({ code: 400, message: '用户名或密码错误' });
    }

    // 登录时刷新会员状态（到期自动降级）
    const db2 = getDb();
    if (user.member_level === 1 && user.member_expire_time > 0) {
      const now = Math.floor(Date.now() / 1000);
      if (now > user.member_expire_time) {
        db2.prepare(
          "UPDATE users SET member_level = 0, member_expire_time = 0, ai_used_today = 0, ai_last_use_date = '', updated_at = datetime('now','localtime') WHERE id = ?"
        ).run(user.id);
        user.member_level = 0;
        user.member_expire_time = 0;
      }
    }

    // 重置每日AI次数（如果不是今天）
    const today = new Date().toISOString().slice(0, 10);
    if (user.ai_last_use_date !== today) {
      db2.prepare("UPDATE users SET ai_used_today = 0, ai_last_use_date = ? WHERE id = ?").run(today, user.id);
      user.ai_used_today = 0;
    }

    const token = generateToken(user);
    console.log('[登录] 用户', user.username, '密码验证通过，生成token');

    // 设置 HttpOnly Cookie
    try {
      var isProduction = process.env.NODE_ENV === 'production';
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
      console.log('[登录] Cookie设置成功');
    } catch (e) {
      console.error('[登录] 设置Cookie失败:', e.message);
    }

    console.log('[登录] 用户', user.username, '登录成功，返回200');
    res.json({
      code: 200,
      data: {
        token,
        user_id: user.id,
        username: user.username,
        level: user.level,
        email: user.email,
        phone: user.phone,
        vip_expire_time: user.vip_expire_time,
        member_level: user.member_level || 0,
        member_expire_time: user.member_expire_time || 0,
        ai_used_today: user.ai_used_today || 0,
        ai_experience_used: user.ai_experience_used || 0
      },
      message: '登录成功'
    });
  } catch (err) {
    console.error('[登录] 异常:', err);
    res.json({ code: 500, message: '登录失败: ' + err.message });
  }
});

// POST /api/user/register
router.get('/info', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const user = db.prepare(
      'SELECT id, username, email, phone, level, vip_expire_time, created_at FROM users WHERE id = ?'
    ).get(req.user_id);

    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    res.json({
      code: 200,
      data: user,
      message: 'success'
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.json({ code: 500, message: '获取用户信息失败' });
  }
});

// POST /api/user/change-password（需登录）
router.post('/change-password', authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const db = getDb();

    if (!oldPassword || !newPassword) {
      return res.json({ code: 400, message: '旧密码和新密码不能为空' });
    }
    if (newPassword.length < 6) {
      return res.json({ code: 400, message: '新密码至少6位' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user_id);
    if (!user) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    const valid = bcrypt.compareSync(oldPassword, user.password_hash);
    if (!valid) {
      return res.json({ code: 400, message: '旧密码错误' });
    }

    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
      .run(newHash, req.user_id);

    res.json({ code: 200, data: null, message: '密码修改成功' });
  } catch (err) {
    console.error('修改密码失败:', err);
    res.json({ code: 500, message: '修改密码失败' });
  }
});

// GET /api/user/daily-count（需登录）
router.get('/daily-count', authMiddleware, (req, res) => {
  try {
    const db = getDb();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 检查VIP是否过期
    const user = db.prepare('SELECT level, vip_expire_time FROM users WHERE id = ?').get(req.user_id);
    let isVip = user.level === 'vip';
    if (isVip && user.vip_expire_time) {
      const now = new Date();
      const expire = new Date(user.vip_expire_time);
      if (now > expire) {
        // VIP已过期，降级
        db.prepare('UPDATE users SET level = \'normal\', vip_expire_time = \'\', updated_at = datetime(\'now\',\'localtime\') WHERE id = ?')
          .run(req.user_id);
        isVip = false;
      }
    }

    const limits = isVip ? config.vipLimits : config.freeLimits;

    // 获取今日使用次数
    const record = db.prepare(
      'SELECT name_count, eval_count, liuyao_count FROM daily_counts WHERE user_id = ? AND date = ?'
    ).get(req.user_id, today);

    const nameUsed = record ? record.name_count : 0;
    const evalUsed = record ? record.eval_count : 0;
    const liuyaoUsed = record ? record.liuyao_count : 0;

    res.json({
      code: 200,
      data: {
        is_vip: isVip,
        name_used: nameUsed,
        name_limit: limits.nameCount,
        name_remain: Math.max(0, limits.nameCount - nameUsed),
        eval_used: evalUsed,
        eval_limit: limits.evalCount,
        eval_remain: Math.max(0, limits.evalCount - evalUsed),
        liuyao_used: liuyaoUsed,
        liuyao_limit: limits.liuyaoCount,
        liuyao_remain: Math.max(0, limits.liuyaoCount - liuyaoUsed)
      },
      message: 'success'
    });
  } catch (err) {
    console.error('获取每日次数失败:', err);
    res.json({ code: 500, message: '获取每日次数失败' });
  }
});

// ==================== 会员系统：AI次数检查与扣减 ====================

// 辅助函数：检查并刷新会员状态（到期自动降级）
function refreshMemberStatus(userId) {
  const db = getDb();
  const user = db.prepare(
    'SELECT member_level, member_expire_time FROM users WHERE id = ?'
  ).get(userId);

  if (!user) return null;

  // 如果是月度会员，检查是否到期
  if (user.member_level === 1 && user.member_expire_time > 0) {
    const now = Math.floor(Date.now() / 1000);
    if (now > user.member_expire_time) {
      // 已到期，自动降级为普通会员
      db.prepare(
        "UPDATE users SET member_level = 0, member_expire_time = 0, ai_used_today = 0, ai_last_use_date = '', updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(userId);
      return { member_level: 0, member_expire_time: 0, ai_used_today: 0, ai_last_use_date: '', ai_experience_used: user.ai_experience_used || 0 };
    }
  }

  return user;
}

// 辅助函数：重置每日AI次数（如果不是今天，自动归零）
function resetDailyAiCountIfNeeded(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const user = db.prepare('SELECT ai_last_use_date FROM users WHERE id = ?').get(userId);

  if (!user || user.ai_last_use_date !== today) {
    db.prepare(
      "UPDATE users SET ai_used_today = 0, ai_last_use_date = ? WHERE id = ?"
    ).run(today, userId);
  }
}

// GET /api/user/ai-quota（需登录）- 查询AI使用配额
router.get('/ai-quota', authMiddleware, (req, res) => {
  try {
    const db = getDb();

    // 先刷新会员状态
    const memberUser = refreshMemberStatus(req.user_id);
    if (!memberUser) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    // 重置每日次数
    resetDailyAiCountIfNeeded(req.user_id);

    // 重新查询最新数据
    const user = db.prepare(
      'SELECT member_level, member_expire_time, ai_used_today, ai_last_use_date, ai_experience_used FROM users WHERE id = ?'
    ).get(req.user_id);

    const isMember = user.member_level === 1;
    const todayLimit = isMember ? 5 : 0; // 月度会员每天5次，普通会员无每日额度
    const usedToday = user.ai_used_today || 0;
    const remaining = isMember ? Math.max(0, todayLimit - usedToday) : 0;
    const hasExperience = (user.ai_experience_used || 0) === 0; // 是否还有体验资格

    res.json({
      code: 200,
      data: {
        is_member: isMember,
        member_level: user.member_level,
        member_expire_time: user.member_expire_time,
        ai_used_today: usedToday,
        ai_daily_limit: todayLimit,
        ai_remaining_today: remaining,
        ai_experience_used: user.ai_experience_used || 0,
        ai_has_experience: hasExperience,
        can_use_ai: isMember ? remaining > 0 : hasExperience
      },
      message: 'success'
    });
  } catch (err) {
    console.error('查询AI配额失败:', err);
    res.json({ code: 500, message: '查询AI配额失败' });
  }
});

// POST /api/user/ai-use（需登录）- 使用AI前检查并扣减次数
router.post('/ai-use', authMiddleware, (req, res) => {
  try {
    const db = getDb();

    // 先刷新会员状态
    const memberUser = refreshMemberStatus(req.user_id);
    if (!memberUser) {
      return res.json({ code: 404, message: '用户不存在' });
    }

    // 重置每日次数
    resetDailyAiCountIfNeeded(req.user_id);

    // 重新查询最新数据
    const user = db.prepare(
      'SELECT member_level, ai_used_today, ai_experience_used FROM users WHERE id = ?'
    ).get(req.user_id);

    const isMember = user.member_level === 1;

    if (isMember) {
      // 月度会员：检查每日次数
      const todayLimit = 5;
      if (user.ai_used_today >= todayLimit) {
        return res.json({
          code: 403,
          message: '您今日的AI使用次数已用完，明天再来吧',
          data: { reason: 'daily_limit', is_member: true, used: user.ai_used_today, limit: todayLimit }
        });
      }
      // 扣减次数
      db.prepare('UPDATE users SET ai_used_today = ai_used_today + 1 WHERE id = ?').run(req.user_id);
      return res.json({
        code: 200,
        data: { allowed: true, is_member: true, used: user.ai_used_today + 1, limit: todayLimit, remaining: todayLimit - user.ai_used_today - 1 },
        message: 'success'
      });
    } else {
      // 普通会员：检查体验资格
      if ((user.ai_experience_used || 0) >= 1) {
        return res.json({
          code: 403,
          message: '您的AI体验资格已用完，办理月度会员（19.8元/月）即可每天使用5次AI功能',
          data: { reason: 'no_experience', is_member: false }
        });
      }
      // 使用体验资格
      db.prepare('UPDATE users SET ai_experience_used = 1, ai_used_today = ai_used_today + 1 WHERE id = ?').run(req.user_id);
      return res.json({
        code: 200,
        data: { allowed: true, is_member: false, experience_used: true },
        message: 'success'
      });
    }
  } catch (err) {
    console.error('AI次数扣减失败:', err);
    res.json({ code: 500, message: 'AI次数扣减失败' });
  }
});

// AI分析记录列表
router.get('/ai-logs', authMiddleware, function(req, res) {
    try {
        var db = getDb();
        var userId = req.user_id;
        var type = req.query.type || '';
        var page = parseInt(req.query.page) || 1;
        var pageSize = parseInt(req.query.pageSize) || 10;
        var offset = (page - 1) * pageSize;

        var whereClause = 'WHERE user_id = ?';
        var params = [userId];
        if (type) {
            whereClause += ' AND analysis_type = ?';
            params.push(type);
        }

        var total, list;
        if (type) {
            total = db.prepare('SELECT COUNT(*) as cnt FROM ai_analysis_logs WHERE user_id = ? AND analysis_type = ?').get(userId, type).cnt;
            list = db.prepare('SELECT id, analysis_type, input_summary, model_name, tokens_used, created_at FROM ai_analysis_logs WHERE user_id = ? AND analysis_type = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
                .all(userId, type, pageSize, offset);
        } else {
            total = db.prepare('SELECT COUNT(*) as cnt FROM ai_analysis_logs WHERE user_id = ?').get(userId).cnt;
            list = db.prepare('SELECT id, analysis_type, input_summary, model_name, tokens_used, created_at FROM ai_analysis_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
                .all(userId, pageSize, offset);
        }

        res.json({
            code: 200,
            data: { list: list, total: total, page: page, pageSize: pageSize, hasMore: offset + list.length < total },
            message: 'success'
        });
    } catch (err) {
        console.error('获取AI记录失败:', err.message, err.stack);
        res.json({ code: 500, message: '获取记录失败' });
    }
});

// AI分析记录详情
router.get('/ai-log/:id', authMiddleware, function(req, res) {
    try {
        var db = getDb();
        var userId = req.user_id;
        var logId = parseInt(req.params.id);

        var log = db.prepare('SELECT * FROM ai_analysis_logs WHERE id = ? AND user_id = ?').get(logId, userId);
        if (!log) {
            return res.json({ code: 404, message: '记录不存在' });
        }

        res.json({ code: 200, data: log, message: 'success' });
    } catch (err) {
        console.error('获取AI记录详情失败:', err);
        res.json({ code: 500, message: '获取记录详情失败' });
    }
});

module.exports = router;
