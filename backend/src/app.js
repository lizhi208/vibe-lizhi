/**
 * Express 应用装配：中间件 + 路由 + 错误处理。
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const notFound = require('./middlewares/notFound');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 业务路由，统一前缀 /api
app.use('/api', routes);

// 404 与统一错误处理（必须放在路由之后）
app.use(notFound);
app.use(errorHandler);

module.exports = app;
