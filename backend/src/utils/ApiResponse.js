/**
 * 统一响应结构：{ code, message, data }
 * code=0 表示成功，非 0 表示业务/系统错误。
 */
class ApiResponse {
  static success(data = null, message = 'ok') {
    return { code: 0, message, data };
  }

  static fail(message = 'error', code = 1, data = null) {
    return { code, message, data };
  }
}

module.exports = ApiResponse;
