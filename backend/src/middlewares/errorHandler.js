const ApiResponse = require('../utils/ApiResponse');

// 统一异常处理：四个参数缺一不可，Express 据此识别为错误中间件
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  console.error('[error]', err);
  res.status(err.status || 500).json(
    ApiResponse.fail(err.message || '服务器内部错误', err.code || 500)
  );
};
