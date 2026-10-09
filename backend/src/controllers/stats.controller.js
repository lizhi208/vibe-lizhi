const statsService = require('../services/stats.service');
const ApiResponse = require('../utils/ApiResponse');

/**
 * 控制器只做「取参 -> 调 service -> 返回」。
 */

// GET /api/stats/overview  商品总览（分类分布 + 状态分布）
exports.overview = async (req, res, next) => {
  try {
    const data = await statsService.overview();
    res.json(ApiResponse.success(data));
  } catch (err) {
    next(err);
  }
};

// POST /api/stats/visit  记录一次页面访问  body: { path }
exports.visit = async (req, res, next) => {
  try {
    await statsService.trackVisit(req.body && req.body.path);
    const visits = await statsService.visits();
    res.json(ApiResponse.success(visits));
  } catch (err) {
    next(err);
  }
};

// GET /api/stats/visits  读取访问量（看板展示）
exports.visits = async (req, res, next) => {
  try {
    const visits = await statsService.visits();
    res.json(ApiResponse.success(visits));
  } catch (err) {
    next(err);
  }
};
