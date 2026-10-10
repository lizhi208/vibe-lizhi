const ApiResponse = require('../utils/ApiResponse');

// 统一异常处理：四个参数缺一不可，Express 据此识别为错误中间件
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  // MySQL 外键约束：插入/更新引用了不存在的关联数据（如幽灵 buyerId、非法 categoryId）
  // 这是请求参数问题，归 400，而不是裸奔成 500。
  if (err && (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2')) {
    return res
      .status(400)
      .json(ApiResponse.fail('关联数据不存在（外键约束）', 400));
  }

  // MySQL 唯一键冲突 → 409
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(ApiResponse.fail('数据重复冲突', 409));
  }

  // multer 上传错误：文件超限（MulterError）或被 fileFilter 拒绝（带 status=400 标记）
  if (err && (err.name === 'MulterError' || err.status === 400 && err.type === 'multer')) {
    return res.status(400).json(ApiResponse.fail(err.message || '上传文件不合法', 400));
  }

  // 状态码归一：只认整数（mysql 原生错误的 err.code 是字符串如 'ER_LOCK_DEADLOCK'，
  // 绝不能拿去当 HTTP 状态码）。HTTP 状态码与响应体 code 强制一致。
  const status = Number.isInteger(err.status)
    ? err.status
    : Number.isInteger(err.code)
      ? err.code
      : 500;

  console.error('[error]', err);
  res.status(status).json(
    ApiResponse.fail(err.message || '服务器内部错误', status)
  );
};
