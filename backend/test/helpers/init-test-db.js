/**
 * 测试数据库初始化：重建隔离测试库并导入 schema。
 *
 * 约定：
 *  - 测试一律使用独立库 flea_market_test，绝不碰开发库 flea_market_ai。
 *  - 连接参数走环境变量；本地由 backend/.env 提供，CI 由 workflow 注入。
 *  - 必须在 require('../src/app') 之前调用/设置环境变量（db.js 在加载时建池）。
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const TEST_DB = process.env.TEST_DB_NAME || 'flea_market_test';

async function resetTestDatabase() {
  // 不指定 database 的管理连接，用于建库/执行全量脚本
  const admin = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  let sql = fs.readFileSync(
    path.join(__dirname, '../../../database/schema.sql'),
    'utf8'
  );
  // 把脚本里写死的开发库名替换为测试库名
  sql = sql.replace(/flea_market_ai/g, TEST_DB);

  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB}\` DEFAULT CHARACTER SET utf8mb4`);
  await admin.query(sql);
  await admin.end();
}

module.exports = { resetTestDatabase, TEST_DB };
