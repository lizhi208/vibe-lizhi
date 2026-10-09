// 前端全局配置：后端 API 基址。
// 优先级：URL 参数 ?api= > localStorage.apiBase > 默认值（本地开发）。
// 部署到 Render 后，把 DEFAULT_API_BASE 改为线上地址，或访问时带 ?api=https://xxx.onrender.com/api

const DEFAULT_API_BASE = 'http://localhost:8080/api';

function resolveApiBase() {
  // 1. URL 参数 ?api=https://xxx.com/api
  const urlParams = new URLSearchParams(location.search);
  const fromUrl = urlParams.get('api');
  if (fromUrl) return fromUrl;

  // 2. localStorage（开发者手动切换）
  const fromStorage = localStorage.getItem('apiBase');
  if (fromStorage) return fromStorage;

  // 3. 默认值（本地开发）
  return DEFAULT_API_BASE;
}

window.API_CONFIG = {
  BASE_URL: resolveApiBase()
};
