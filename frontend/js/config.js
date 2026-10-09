// 前端全局配置：后端 API 基址。
// 优先级：URL 参数 ?api= > 默认值（本地 localhost / 线上相对路径 /api）。
// 线上由 Vercel vercel.json 的 rewrite 规则代理 /api/* 到 ngrok/Render 后端。

const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
const DEFAULT_API_BASE = isLocal
  ? 'http://localhost:8080/api'   // 本地开发：直接连本地后端
  : '/api';                        // 线上：Vercel rewrite 代理到 ngrok/Render

function resolveApiBase() {
  // URL 参数 ?api=https://xxx.com/api（最高优先级，调试用）
  const urlParams = new URLSearchParams(location.search);
  const fromUrl = urlParams.get('api');
  if (fromUrl) return fromUrl;

  return DEFAULT_API_BASE;
}

window.API_CONFIG = {
  BASE_URL: resolveApiBase()
};
