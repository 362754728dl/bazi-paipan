const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway')
    ? { rejectUnauthorized: false }
    : (process.env.DATABASE_URL ? { rejectUnauthorized: false } : false),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('PostgreSQL 连接池错误:', err.message);
});

/**
 * 执行 SQL 查询
 */
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 100) {
    console.log('慢查询', { text: text.substring(0, 60), duration: duration + 'ms', rows: res.rowCount });
  }
  return res;
}

module.exports = { pool, query };
