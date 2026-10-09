/**
 * MySQL 连接池（mysql2/promise）。
 * 使用前请先执行 database/schema.sql，并在 backend/.env 中配置连接信息。
 */
const mysql = require('mysql2/promise');

// 云端 MySQL（如 Aiven）强制 SSL；本地 MySQL 不需要。
// 通过环境变量 DB_SSL=true 开启，默认关闭以兼容本地。
const useSsl = String(process.env.DB_SSL || '').toLowerCase() === 'true';

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'flea_market_ai',
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // Aiven 使用自签 CA，mysql2 用 rejectUnauthorized:false 即可连通
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {})
});

module.exports = pool;
