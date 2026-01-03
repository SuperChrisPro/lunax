const { Pool } = require('pg');
require('dotenv').config();

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      max: 20, // 最大连接数
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // 连接池错误处理
    pool.on('error', (err, client) => {
      console.error('PostgreSQL 连接池错误:', err);
    });
  }
  return pool;
}

// 测试数据库连接
async function testConnection() {
  try {
    const testPool = getPool();
    const result = await testPool.query('SELECT NOW()');
    console.log('PostgreSQL连接测试成功:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('PostgreSQL连接测试失败:', error);
    return false;
  }
}

// 关闭连接池
async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { 
  pool: getPool(),
  getPool,
  close,
  testConnection
};
