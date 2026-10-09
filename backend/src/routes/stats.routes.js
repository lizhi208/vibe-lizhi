/**
 * 统计接口：商品总览 / 访问统计。
 */
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/stats.controller');

// GET  /api/stats/overview   商品总览（ECharts 饼图/柱状图数据）
router.get('/overview', statsController.overview);

// POST /api/stats/visit      记录一次访问  body: { path }
router.post('/visit', statsController.visit);

// GET  /api/stats/visits     读取访问量
router.get('/visits', statsController.visits);

module.exports = router;
