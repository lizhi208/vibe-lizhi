/**
 * 极简 fetch 封装：统一拼 URL、解析 { code, message, data }。
 */
(function () {
  const BASE_URL = window.API_CONFIG.BASE_URL;

  async function request(path, options = {}) {
    const res = await fetch(BASE_URL + path, {
      headers: options.body instanceof FormData
        ? {} // 让浏览器自动带 multipart boundary
        : { 'Content-Type': 'application/json' },
      ...options
    });

    let payload;
    try {
      payload = await res.json();
    } catch (e) {
      throw new Error('服务器响应格式异常');
    }

    if (!res.ok || payload.code !== 0) {
      throw new Error(payload.message || `请求失败 (${res.status})`);
    }
    return payload.data;
  }

  window.api = {
    get: (path) => request(path),
    post: (path, body) =>
      request(path, { method: 'POST', body: JSON.stringify(body) }),
    upload: (path, formData) =>
      request(path, { method: 'POST', body: formData }),
    patch: (path, body) =>
      request(path, { method: 'PATCH', body: JSON.stringify(body) })
  };
})();
