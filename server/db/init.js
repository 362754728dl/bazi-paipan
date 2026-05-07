// sql.js 延迟加载，仅在 SQLite 模式下 require（Railway/PostgreSQL 环境不需要）
let initSqlJs = null;
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('../config');

let db = null;
let isPg = false; // 标记当前是否使用 PostgreSQL

/**
 * 创建 better-sqlite3 风格的兼容包装器（SQLite 模式）
 */
function createCompatDb(sqlDb) {
  return {
    exec: function(sql) { sqlDb.run(sql); },
    pragma: function(key) { sqlDb.exec('PRAGMA ' + key); },
    prepare: function(sql) {
      var stmt = sqlDb.prepare(sql);
      return {
        get: function() {
          stmt.bind(Array.prototype.slice.call(arguments));
          if (stmt.step()) { var row = stmt.getAsObject(); stmt.free(); return row; }
          stmt.free(); return undefined;
        },
        all: function() {
          var results = [];
          stmt.bind(Array.prototype.slice.call(arguments));
          while (stmt.step()) { results.push(stmt.getAsObject()); }
          stmt.free(); return results;
        },
        run: function() {
          stmt.bind(Array.prototype.slice.call(arguments));
          stmt.step(); stmt.free();
          return {
            lastInsertRowid: sqlDb.exec('SELECT last_insert_rowid() as id')[0].values[0][0],
            changes: sqlDb.getRowsModified()
          };
        }
      };
    }
  };
}

/**
 * 创建 PostgreSQL 兼容包装器
 * 将 db.prepare(sql).get(params) / .all(params) / .run(params) 映射到 pg 查询
 * 自动转换 SQLite 特有语法为 PostgreSQL 语法
 */
function createPgCompatDb(pgPool) {
  const { query } = require('./pg');

  /**
   * 将 SQLite SQL 转换为 PostgreSQL SQL
   */
  function convertSql(sql) {
    let pgSql = sql;

    // 1. INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
    pgSql = pgSql.replace(/INSERT\s+OR\s+IGNORE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      function(match, table, cols, vals) {
        return 'INSERT INTO ' + table + ' (' + cols + ') VALUES (' + vals + ') ON CONFLICT DO NOTHING';
      });

    // 2. INSERT OR REPLACE → 先删除再插入（通用方案）
    // 对于有 UNIQUE 约束的表，使用 ON CONFLICT
    pgSql = pgSql.replace(/INSERT\s+OR\s+REPLACE\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)/gi,
      function(match, table, cols, vals) {
        // 提取唯一约束列（简化处理：对已知表使用 ON CONFLICT）
        const conflictMap = {
          'name_cache': 'surname, birthday, birthplace, style',
          'eval_cache': 'name, birthday, birthplace',
          'liuyao_ai_cache': 'hex_binary, matter',
          'hepei_cache': 'user_id, baziA, baziB'
        };
        const conflictCols = conflictMap[table];
        if (conflictCols) {
          // 构建 ON CONFLICT DO UPDATE SET
          const colList = cols.split(',').map(function(c) { return c.trim(); });
          const valList = vals.split(',').map(function(v) { return v.trim(); });
          const setClause = colList.map(function(c, i) {
            if (c === 'created_at') return 'created_at = NOW()';
            return c + ' = EXCLUDED.' + c;
          }).join(', ');
          return 'INSERT INTO ' + table + ' (' + cols + ') VALUES (' + vals + ') ON CONFLICT (' + conflictCols + ') DO UPDATE SET ' + setClause;
        }
        // 未知表：使用简单覆盖
        return 'INSERT INTO ' + table + ' (' + cols + ') VALUES (' + vals + ')';
      });

    // 3. datetime('now','localtime') → NOW()
    pgSql = pgSql.replace(/datetime\(\s*'now'\s*,\s*'localtime'\s*\)/gi, 'NOW()');

    // 4. strftime('%s','now') → EXTRACT(EPOCH FROM NOW())::BIGINT
    pgSql = pgSql.replace(/strftime\(\s*'%s'\s*,\s*'now'\s*\)/gi, "EXTRACT(EPOCH FROM NOW())::BIGINT");

    // 5. date(created_at) → created_at::date
    pgSql = pgSql.replace(/date\((\w+)\)/gi, '$1::date');

    // 6. MAX(0, expr) → GREATEST(0, expr)（在 UPDATE SET 中）
    pgSql = pgSql.replace(/MAX\s*\(\s*0\s*,\s*/gi, 'GREATEST(0, ');

    // 7. ? 占位符 → $1, $2, ... （延迟到执行时处理，这里只标记）

    return pgSql;
  }

  return {
    exec: async function(sql) {
      const pgSql = convertSql(sql);
      await query(pgSql);
    },
    pragma: function() {
      // PostgreSQL 不需要 PRAGMA，忽略
    },
    prepare: function(sql) {
      const pgSql = convertSql(sql);
      return {
        get: async function() {
          const params = Array.prototype.slice.call(arguments);
          const finalSql = replacePlaceholders(pgSql);
          const res = await query(finalSql, params);
          return res.rows[0] || undefined;
        },
        all: async function() {
          const params = Array.prototype.slice.call(arguments);
          const finalSql = replacePlaceholders(pgSql);
          const res = await query(finalSql, params);
          return res.rows;
        },
        run: async function() {
          const params = Array.prototype.slice.call(arguments);
          const finalSql = replacePlaceholders(pgSql);
          const res = await query(finalSql, params);
          return {
            lastInsertRowid: res.rows[0] ? res.rows[0].id : 0,
            changes: res.rowCount
          };
        }
      };
    }
  };
}

/**
 * 将 ? 占位符替换为 $1, $2, ... （PostgreSQL 参数化查询格式）
 */
function replacePlaceholders(sql) {
  let index = 0;
  return sql.replace(/\?/g, function() {
    index++;
    return '$' + index;
  });
}

/**
 * SQLite 模式初始化
 */
async function initSqlite() {
  const dbDir = path.dirname(path.resolve(config.dbPath));
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.resolve(config.dbPath);
  if (!initSqlJs) initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  var compatDb = createCompatDb(db);

  // ==================== SQLite 建表语句 ====================
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

  compatDb.exec(`CREATE TABLE IF NOT EXISTS eval_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birthday TEXT NOT NULL,
    birthplace TEXT DEFAULT '',
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  compatDb.exec(`CREATE TABLE IF NOT EXISTS name_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surname TEXT NOT NULL,
    birthday TEXT NOT NULL,
    birthplace TEXT DEFAULT '',
    style TEXT DEFAULT '',
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

  compatDb.exec(`CREATE TABLE IF NOT EXISTS liuyao_ai_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hex_binary TEXT NOT NULL,
    matter TEXT DEFAULT '',
    result TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now','localtime'))
  )`);

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

  compatDb.exec(`
    CREATE TABLE IF NOT EXISTS registration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE INDEX IF NOT EXISTS idx_reg_logs_ip_time ON registration_logs(ip, created_at);
  `);

  // 兼容已有数据库：为 daily_counts 添加 liuyao_count 列
  try { compatDb.exec(`ALTER TABLE daily_counts ADD COLUMN liuyao_count INTEGER DEFAULT 0`); } catch(e) {}

  // 会员系统字段升级
  try { compatDb.exec(`ALTER TABLE users ADD COLUMN member_level INTEGER DEFAULT 0`); } catch(e) {}
  try { compatDb.exec(`ALTER TABLE users ADD COLUMN member_expire_time INTEGER DEFAULT 0`); } catch(e) {}
  try { compatDb.exec(`ALTER TABLE users ADD COLUMN ai_used_today INTEGER DEFAULT 0`); } catch(e) {}
  try { compatDb.exec(`ALTER TABLE users ADD COLUMN ai_last_use_date TEXT DEFAULT ''`); } catch(e) {}
  try { compatDb.exec(`ALTER TABLE users ADD COLUMN ai_experience_used INTEGER DEFAULT 0`); } catch(e) {}
  try { compatDb.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'normal'`); } catch(e) {}

  // 创建默认管理员账号
  const adminExists = compatDb.prepare('SELECT id FROM users WHERE username = ?').get(config.adminUser);
  if (!adminExists) {
    const hash = bcrypt.hashSync(config.adminPassword, 10);
    compatDb.prepare('INSERT INTO users (username, password_hash, level, role) VALUES (?, ?, ?, ?)')
      .run(config.adminUser, hash, 'vip', 'admin');
    console.log('默认管理员账号已创建: ' + config.adminUser);
  } else {
    try {
      compatDb.prepare("UPDATE users SET role = 'admin' WHERE username = ? AND (role IS NULL OR role = '' OR role = 'normal')")
        .run(config.adminUser);
    } catch(e) {}
  }

  var rawSqlDb = db;
  saveDb();
  db = compatDb;
  db._sqlDb = rawSqlDb;

  console.log('数据库初始化完成（sql.js 驱动）');
}

/**
 * 主初始化函数：根据环境变量选择数据库
 */
async function initDb() {
  if (process.env.DATABASE_URL) {
    console.log('检测到 DATABASE_URL，使用 PostgreSQL 数据库');
    isPg = true;
    const initPg = require('./init-pg');
    await initPg();
    const { pool } = require('./pg');
    db = createPgCompatDb(pool);
  } else {
    console.log('未检测到 DATABASE_URL，使用 SQLite 数据库');
    isPg = false;
    await initSqlite();
  }
}

/**
 * 将内存中的数据库保存到文件（仅 SQLite 模式）
 */
function saveDb() {
  if (isPg) return; // PostgreSQL 不需要手动保存
  try {
    const data = db._sqlDb ? db._sqlDb.export() : db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(path.resolve(config.dbPath), buffer);
  } catch(e) {}
}

function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDb()');
  }
  return db;
}

function isPostgres() {
  return isPg;
}

module.exports = { initDb, getDb, saveDb, isPostgres };
