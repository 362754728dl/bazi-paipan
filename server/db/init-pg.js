const { query } = require('./pg');
const bcrypt = require('bcryptjs');
const config = require('../config');

/**
 * PostgreSQL 建表语句
 * 所有 SQLite 特有语法已转换为 PostgreSQL 兼容语法
 */
async function initPg() {
  console.log('正在初始化 PostgreSQL 数据库...');

  // users 表
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      level TEXT DEFAULT 'normal' CHECK(level IN ('normal','vip','disabled')),
      vip_expire_time TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      member_level INTEGER DEFAULT 0,
      member_expire_time BIGINT DEFAULT 0,
      ai_used_today INTEGER DEFAULT 0,
      ai_last_use_date TEXT DEFAULT '',
      ai_experience_used INTEGER DEFAULT 0,
      role TEXT DEFAULT 'normal'
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);

  // name_records 表
  await query(`
    CREATE TABLE IF NOT EXISTS name_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      surname TEXT NOT NULL,
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      birthplace TEXT DEFAULT '',
      style TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_name_records_user ON name_records(user_id);`);

  // eval_records 表
  await query(`
    CREATE TABLE IF NOT EXISTS eval_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      birthplace TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_eval_records_user ON eval_records(user_id);`);

  // orders 表
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'vip' CHECK(type IN ('vip','biaowen')),
      amount DOUBLE PRECISION DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled','expired')),
      pay_time TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);`);

  // biaowen_orders 表
  await query(`
    CREATE TABLE IF NOT EXISTS biaowen_orders (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      deceased_name TEXT DEFAULT '',
      deceased_gender TEXT DEFAULT '',
      address TEXT DEFAULT '',
      family_member TEXT DEFAULT '',
      family_rank TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','shipped','completed')),
      tracking_no TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // daily_counts 表
  await query(`
    CREATE TABLE IF NOT EXISTS daily_counts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      name_count INTEGER DEFAULT 0,
      eval_count INTEGER DEFAULT 0,
      liuyao_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, date)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_daily_counts_user_date ON daily_counts(user_id, date);`);

  // eval_cache 表
  await query(`
    CREATE TABLE IF NOT EXISTS eval_cache (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      birthday TEXT NOT NULL,
      birthplace TEXT DEFAULT '',
      result TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // name_cache 表
  await query(`
    CREATE TABLE IF NOT EXISTS name_cache (
      id SERIAL PRIMARY KEY,
      surname TEXT NOT NULL,
      birthday TEXT NOT NULL,
      birthplace TEXT DEFAULT '',
      style TEXT DEFAULT '',
      result TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // liuyao_ai_cache 表
  await query(`
    CREATE TABLE IF NOT EXISTS liuyao_ai_cache (
      id SERIAL PRIMARY KEY,
      hex_binary TEXT NOT NULL,
      matter TEXT DEFAULT '',
      result TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // liuyao_ai_records 表
  await query(`
    CREATE TABLE IF NOT EXISTS liuyao_ai_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      hex_binary TEXT NOT NULL,
      hex_name TEXT DEFAULT '',
      matter TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_liuyao_ai_records_user ON liuyao_ai_records(user_id);`);

  // name_evaluation_cache 表
  await query(`
    CREATE TABLE IF NOT EXISTS name_evaluation_cache (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      bazi_data TEXT NOT NULL DEFAULT '',
      evaluation_result TEXT NOT NULL DEFAULT '',
      created_at BIGINT DEFAULT EXTRACT(EPOCH FROM NOW())::BIGINT,
      UNIQUE(user_id, name, bazi_data)
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_name_eval_cache_lookup ON name_evaluation_cache(user_id, name, bazi_data);`);

  // paipan_records 表
  await query(`
    CREATE TABLE IF NOT EXISTS paipan_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      name TEXT DEFAULT '',
      solar_date TEXT DEFAULT '',
      lunar_date TEXT DEFAULT '',
      gender INTEGER DEFAULT 1,
      sheng_xiao TEXT DEFAULT '',
      bazi_str TEXT DEFAULT '',
      form_data TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_paipan_records_user ON paipan_records(user_id);`);

  // registration_logs 表
  await query(`
    CREATE TABLE IF NOT EXISTS registration_logs (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_reg_logs_ip_time ON registration_logs(ip, created_at);`);

  // ai_use_logs 表（proxy.js 中动态创建）
  await query(`
    CREATE TABLE IF NOT EXISTS ai_use_logs (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // hepei_records 表
  await query(`
    CREATE TABLE IF NOT EXISTS hepei_records (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      nameA TEXT DEFAULT '',
      genderA INTEGER DEFAULT 1,
      baziA TEXT DEFAULT '',
      strengthA TEXT DEFAULT '',
      nameB TEXT DEFAULT '',
      genderB INTEGER DEFAULT 1,
      baziB TEXT DEFAULT '',
      strengthB TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // hepei_cache 表
  await query(`
    CREATE TABLE IF NOT EXISTS hepei_cache (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      baziA TEXT DEFAULT '',
      baziB TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // 创建默认管理员账号
  const adminRes = await query('SELECT id FROM users WHERE username = $1', [config.adminUser]);
  if (adminRes.rows.length === 0) {
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    await query(
      'INSERT INTO users (username, password_hash, level, role) VALUES ($1, $2, $3, $4)',
      [config.adminUser, hash, 'vip', 'admin']
    );
    console.log('默认管理员账号已创建: ' + config.adminUser);
  } else {
    // 确保现有管理员账号的 role 为 'admin'
    await query(
      "UPDATE users SET role = 'admin' WHERE username = $1 AND (role IS NULL OR role = '' OR role = 'normal')",
      [config.adminUser]
    );
  }

  // 确保 password_hash 字段足够长（bcrypt hash 需要 60+ 字符）
  try {
    await query(`ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255)`);
    console.log('password_hash 字段已确保为 VARCHAR(255)');
  } catch(e) {
    console.log('password_hash 字段长度检查:', e.message);
  }

  console.log('PostgreSQL 数据库初始化完成');
}

module.exports = initPg;
