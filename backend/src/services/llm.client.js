/**
 * LLM 客户端：OpenAI 兼容协议（POST {baseUrl}/chat/completions）的最小封装。
 * 默认适配阿里云百炼 compatible-mode；换供应商（火山/硅基流动）只改 .env，零改码。
 *
 * 安全与降级约定（契约 §10）：
 *  - Key 只存在服务端 .env，绝不进前端、不进 git；
 *  - 未配置 Key（空值/占位符）时不发起任何外部请求，直接 502 降级；
 *  - 一切失败统一抛 err.status = 502 的错误，由全局错误中间件转 HTTP 502。
 */
const axios = require('axios');

// .env 模板里的占位符与空值都视为「未配置」
const PLACEHOLDER_KEYS = new Set(['', 'your_api_key', 'your-api-key', 'sk-xxx']);

function isConfigured(apiKey) {
  return typeof apiKey === 'string' && !PLACEHOLDER_KEYS.has(apiKey.trim());
}

function aiUnavailable(message) {
  const err = new Error(message);
  err.status = 502;
  return err;
}

/**
 * 调用 OpenAI 兼容的 chat/completions，返回模型文本输出。
 * @param {object} cfg
 * @param {string} cfg.baseUrl 例：https://dashscope.aliyuncs.com/compatible-mode/v1
 * @param {string} cfg.apiKey  服务端密钥
 * @param {string} cfg.model   例：qwen-vl-max
 * @param {Array}  cfg.messages OpenAI 消息数组（多模态消息可含图片 data URL）
 * @param {number} [cfg.timeoutMs] 默认 5000ms，契约：超时按 502 降级
 * @param {Function} [post] 仅测试注入的假 HTTP POST，签名同 axios.post；生产勿传
 * @returns {Promise<string>} choices[0].message.content
 */
async function chatCompletions(
  { baseUrl, apiKey, model, messages, timeoutMs = 5000 },
  post = axios.post
) {
  if (!isConfigured(apiKey)) {
    throw aiUnavailable('AI 服务未配置（缺少 API Key），可直接手动填写');
  }

  let resp;
  try {
    resp = await post(
      `${baseUrl}/chat/completions`,
      { model, messages },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: timeoutMs
      }
    );
  } catch (e) {
    // axios 超时 code 为 ECONNABORTED；欠费/鉴权失败/限流走 e.response；断网无 response
    if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message || '')) {
      throw aiUnavailable('AI 服务响应超时，请稍后重试或手动填写');
    }
    if (e.response) {
      throw aiUnavailable(`AI 服务返回错误（上游状态 ${e.response.status}），可手动填写`);
    }
    throw aiUnavailable('AI 服务暂不可达，请检查网络或稍后重试');
  }

  const choice = resp && resp.data && Array.isArray(resp.data.choices)
    ? resp.data.choices[0]
    : null;
  const content = choice && choice.message ? choice.message.content : null;
  if (typeof content !== 'string' || !content.trim()) {
    throw aiUnavailable('AI 服务返回内容为空，可手动填写');
  }
  return content;
}

module.exports = { chatCompletions, isConfigured };
