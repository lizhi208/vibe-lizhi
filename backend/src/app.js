/**
 * Express 应用装配：中间件 + 路由 + 错误处理。
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 业务路由，统一前缀 /api
app.use('/api', routes);

// 静态托管前端（同域部署，ngrok 暴露 8080 即可同时访问前端和 API）
app.use(express.static(path.join(__dirname, '../../frontend')));

// 404 与统一错误处理（必须放在路由之后）
app.use(notFound);
app.use(errorHandler);

module.exports = app;
