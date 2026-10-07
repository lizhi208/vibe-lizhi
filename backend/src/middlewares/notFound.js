const ApiResponse = require('../utils/ApiResponse');

// 未匹配任何路由
module.exports = function notFound(req, res) {
  res.status(404).json(ApiResponse.fail('接口不存在', 404, { path: req.originalUrl }));
};
