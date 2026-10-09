/**
 * Aiven MySQL 一键导入脚本（schema + seed_data）
 * 用法：node deploy/aiven-import.js <host> <port> <password>
 * 示例：node deploy/aiven-import.js flea-mysql-xxx.aivencloud.com 23456 avnadmin_password
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const [host, port, password] = process.argv.slice(2);

if (!host || !port || !password) {
  console.error('用法: node deploy/aiven-import.js <host> <port> <password>');
  console.error('示例: node deploy/aiven-import.js flea-mysql-xxx.aivencloud.com 23456 mypassword');
  process.exit(1);
}

async function run() {
  console.log(`连接 Aiven: ${host}:${port} ...`);
  const conn = await mysql.createConnection({
    host,
    port: Number(port),
    user: 'avnadmin',
    password,
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false },
    multipleStatements: true
  });

  console.log('连接成功，执行 schema.sql ...');
  const schema = fs.readFileSync(path.join(__dirname, '../database/schema.sql'), 'utf8');
  // Aiven 免费档禁止创建新数据库，把 CREATE DATABASE/USE 替换为 USE defaultdb
  const fixedSchema = schema
    .replace(/CREATE DATABASE IF NOT EXISTS flea_market_ai[^;]*;/i, '-- Aiven 免费档使用默认库')
    .replace(/USE flea_market_ai;/i, 'USE defaultdb;');
  await conn.query(fixedSchema);

  console.log('执行 seed_data.sql ...');
  const seed = fs.readFileSync(path.join(__dirname, '../database/seed_data.sql'), 'utf8');
  const fixedSeed = seed.replace(/USE flea_market_ai;/i, 'USE defaultdb;');
  await conn.query(fixedSeed);

  const [rows] = await conn.query('SELECT COUNT(*) AS c FROM products');
  console.log(`导入完成，products 表共 ${rows[0].c} 行`);

  await conn.end();
  console.log('Aiven 数据库初始化成功！');
}

run().catch(err => {
  console.error('导入失败:', err.message);
  process.exit(1);
});
