const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('../config');

let db = null;

/**
 * 创建 better-sqlite3 风格的兼容包装器
 * sql.js 本身是同步API，与 better-sqlite3 调用方式非常接近
 * 只需包装 prepare().get/all/run 使参数传递方式一致
 */
function createCompatDb(sqlDb) {
  return {
    // db.exec(sql) - sql.js 原生支持，直接透传
    exec: function(sql) {
      sqlDb.run(sql);
    },

    // db.pragma(key) - sql.js 通过 exec 设置 pragma
    pragma: function(key) {
      sqlDb.exec('PRAGMA ' + key);
    },

    // db.prepare(sql) 返回语句对象，支持 .get() / .all() / .run()
    prepare: function(sql) {
      var stmt = sqlDb.prepare(sql);
      return {
        get: function() {
          stmt.bind(Array.prototype.slice.call(arguments));
          if (stmt.step()) {
            var row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        },
        all: function() {
          var results = [];
          stmt.bind(Array.prototype.slice.call(arguments));
          while (stmt.step()) {
            results.push(stmt.getAsObject());
          }
          stmt.free();
          return results;
        },
        run: function() {
          stmt.bind(Array.prototype.slice.call(arguments));
          stmt.step();
          stmt.free();
          // 兼容 better-sqlite3 的返回格式
          return {
            lastInsertRowid: sqlDb.exec('SELECT last_insert_rowid() as id')[0].values[0][0],
            changes: sqlDb.getRowsModified()
          };
        }
      };
    }
  };
}

async function initDb() {
  // 确保数据目录存在
  const dbDir = path.dirname(path.resolve(config.dbPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.resolve(config.dbPath);
  const SQL = await initSqlJs();

  // 如果数据库文件已存在，加载它；否则创建新的内存数据库
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 设置 pragma（sql.js 通过 exec 设置）
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // 创建兼容包装器
  var compatDb = createCompatDb(db);

  // ==================== 以下所有建表语句与原版完全一致 ====================

  // 创建 users 表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      level TEXT DEFAULT 'normal' CHECK(level IN ('normal','vip','disabled')),
      vip_expire_time TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  `);

  // 创建 name_records 表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS name_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      surname TEXT NOT NULL,
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      birthplace TEXT DEFAULT '',
      style TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_name_records_user ON name_records(user_id);
  `);

  // 创建 eval_records 表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS eval_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      gender TEXT DEFAULT '',
      birthday TEXT DEFAULT '',
      birthplace TEXT DEFAULT '',
      result TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_eval_records_user ON eval_records(user_id);
  `);

  // 创建 orders 表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_no TEXT UNIQUE NOT NULL,
      type TEXT DEFAULT 'vip' CHECK(type IN ('vip','biaowen')),
      amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','paid','cancelled','expired')),
      pay_time TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
  `);

  // 创建 biaowen_orders 表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS biaowen_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      deceased_name TEXT DEFAULT '',
      deceased_gender TEXT DEFAULT '',
      address TEXT DEFAULT '',
      family_member TEXT DEFAULT '',
      family_rank TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','shipped','completed')),
      tracking_no TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );
  `);

  // 创建 daily_counts 表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS daily_counts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      name_count INTEGER DEFAULT 0,
      eval_count INTEGER DEFAULT 0,
      liuyao_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime')),
      UNIQUE(user_id, date),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_daily_counts_user_date ON daily_counts(user_id, date);
  `);

  // 评测缓存表
  compatDb.exec(`CREATE TABLE IF NOT EXISTS eval_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birthday TEXT NOT NULL,
    birthplace TEXT DEFAULT '',
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // 取名缓存表
  compatDb.exec(`CREATE TABLE IF NOT EXISTS name_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surname TEXT NOT NULL,
    birthday TEXT NOT NULL,
    birthplace TEXT DEFAULT '',
    style TEXT DEFAULT '',
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // 六爻AI分析缓存表
  compatDb.exec(`CREATE TABLE IF NOT EXISTS liuyao_ai_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hex_binary TEXT NOT NULL,
    matter TEXT DEFAULT '',
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  // 六爻AI分析记录表
  compatDb.exec(`CREATE TABLE IF NOT EXISTS liuyao_ai_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    hex_binary TEXT NOT NULL,
    hex_name TEXT DEFAULT '',
    matter TEXT DEFAULT '',
    result TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  compatDb.exec(`CREATE INDEX IF NOT EXISTS idx_liuyao_ai_records_user ON liuyao_ai_records(user_id)`);

  // 姓名评测缓存表（带用户维度，支持相同八字+姓名的精确缓存）
  compatDb.exec(`CREATE TABLE IF NOT EXISTS name_evaluation_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    bazi_data TEXT NOT NULL DEFAULT '',
    evaluation_result TEXT NOT NULL DEFAULT '',
    created_at INTEGER DEFAULT (strftime('%s','now')),
    UNIQUE(user_id, name, bazi_data),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);
  compatDb.exec(`CREATE INDEX IF NOT EXISTS idx_name_eval_cache_lookup ON name_evaluation_cache(user_id, name, bazi_data)`);

  // 八字排盘记录表
  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS paipan_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT DEFAULT '',
      solar_date TEXT DEFAULT '',
      lunar_date TEXT DEFAULT '',
      gender INTEGER DEFAULT 1,
      sheng_xiao TEXT DEFAULT '',
      bazi_str TEXT DEFAULT '',
      form_data TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_paipan_records_user ON paipan_records(user_id);
  `);

  // 兼容已有数据库：为 daily_counts 添加 liuyao_count 列
  try {
    compatDb.exec(`ALTER TABLE daily_counts ADD COLUMN liuyao_count INTEGER DEFAULT 0`);
  } catch(e) { /* 列已存在则忽略 */ }

  // 兼容已有数据库：为 daily_counts 添加 ai_count 列（统一AI配额管理）
  try {
    compatDb.exec(`ALTER TABLE daily_counts ADD COLUMN ai_count INTEGER DEFAULT 0`);
  } catch(e) { /* 列已存在则忽略 */ }

  // 会员系统字段升级（兼容原有数据）
  try {
    compatDb.exec(`ALTER TABLE users ADD COLUMN member_level INTEGER DEFAULT 0`);
  } catch(e) { /* 列已存在则忽略 */ }
  try {
    compatDb.exec(`ALTER TABLE users ADD COLUMN member_expire_time INTEGER DEFAULT 0`);
  } catch(e) { /* 列已存在则忽略 */ }
  try {
    compatDb.exec(`ALTER TABLE users ADD COLUMN ai_used_today INTEGER DEFAULT 0`);
  } catch(e) { /* 列已存在则忽略 */ }
  try {
    compatDb.exec(`ALTER TABLE users ADD COLUMN ai_last_use_date TEXT DEFAULT ''`);
  } catch(e) { /* 列已存在则忽略 */ }
  try {
    compatDb.exec(`ALTER TABLE users ADD COLUMN ai_experience_used INTEGER DEFAULT 0`);
  } catch(e) { /* 列已存在则忽略 */ }

  // 创建默认管理员账号
  const adminExists = compatDb.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUser);
  if (!adminExists) {
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    compatDb.prepare(
      'INSERT INTO users (username, password_hash, level) VALUES (?, ?, ?)'
    ).run(config.adminUser, hash, 'vip');
    console.log('默认管理员账号已创建: ' + config.adminUser);
  }

  // AI分析记录表
  compatDb.exec(`CREATE TABLE IF NOT EXISTS ai_analysis_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    analysis_type TEXT NOT NULL,
    input_summary TEXT DEFAULT '',
    full_prompt TEXT DEFAULT '',
    full_response TEXT DEFAULT '',
    model_name TEXT DEFAULT '',
    tokens_used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 索引
  try { compatDb.exec('CREATE INDEX IF NOT EXISTS idx_ai_logs_user_type ON ai_analysis_logs(user_id, analysis_type)'); } catch(e) {}
  try { compatDb.exec('CREATE INDEX IF NOT EXISTS idx_ai_logs_user_time ON ai_analysis_logs(user_id, created_at)'); } catch(e) {}

  // 保存数据库到文件
  var rawSqlDb = db; // 保存原始 sql.js Database 引用
  saveDb();

  // 将兼容包装器赋值给全局 db（供 getDb 返回）
  db = compatDb;
  // 同时保存原始 sqlDb 引用用于持久化
  db._sqlDb = rawSqlDb;

  console.log('数据库初始化完成（sql.js 驱动）');
}

/**
 * 将内存中的数据库保存到文件
 */
function saveDb() {
  try {
    const data = db._sqlDb ? db._sqlDb.export() : db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(path.resolve(config.dbPath), buffer);
  } catch(e) {
    // 初始化阶段可能还未赋值 _sqlDb，忽略
  }
}

function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDb()');
  }
  return db;
}

module.exports = { initDb, getDb, saveDb };
