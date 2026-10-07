/**
 * 服务入口：只负责启动 HTTP 服务。
 * 业务装配见 app.js。
 */
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[server] 二手集市后端已启动: http://localhost:${PORT}`);
});
