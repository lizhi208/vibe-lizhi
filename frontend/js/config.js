// 前端全局配置：后端 API 基址。
// 后端同域托管前端，API 用相对路径 /api 即可。
// 调试时可加 ?api=http://localhost:8080/api 强制指定。

const DEFAULT_API_BASE = '/api';

function resolveApiBase() {
  const urlParams = new URLSearchParams(location.search);
  const fromUrl = urlParams.get('api');
  if (fromUrl) return fromUrl;
  return DEFAULT_API_BASE;
}

window.API_CONFIG = {
  BASE_URL: resolveApiBase()
};
