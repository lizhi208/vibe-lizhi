/**
 * AI 服务：只封装对第三方大模型 API 的调用，本项目不训练模型。
 * 配置见 backend/.env：AI_API_BASE_URL / AI_API_KEY / AI_MODEL
 * 契约 §10：一切失败（无 Key / 超时 / 上游错误 / 输出无法解析）统一 502 降级，
 * 前端必须保留手动填写路径，AI 失败不阻断发布闭环。
 */
const { chatCompletions } = require('./llm.client');
const { buildDraftMessages } = require('./ai.prompts');

function parseError(message) {
  const err = new Error(message);
  err.status = 502;
  return err;
}

/**
 * 把模型文本输出解析为草稿对象，容忍 ```json 代码围栏。
 * @param {string} content 模型原始输出
 * @returns {{title:string, description:string, referencePrice:number|null}}
 */
function parseDraft(content) {
  const text = String(content).trim().replace(/^```(?:json)?\s*|\s*```$/g, '');
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    throw parseError('AI 返回内容无法解析，可手动填写');
  }
  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  const description = typeof obj.description === 'string' ? obj.description.trim() : '';
  if (!title || !description) {
    throw parseError('AI 返回内容缺少标题或描述字段，可手动填写');
  }
  // 契约允许 referencePrice 为 null（AI 无法估价）；注意 Number(null)===0，必须先判空
  if (obj.referencePrice === null || obj.referencePrice === undefined) {
    return { title, description, referencePrice: null };
  }
  const price = Number(obj.referencePrice);
  const referencePrice = Number.isFinite(price) && price >= 0 ? price : null;
  return { title, description, referencePrice };
}

const aiService = {
  /**
   * 根据物品照片生成发布草稿。
   * @param {Express.Multer.File} image multer memoryStorage 取出的图片文件
   * @returns {Promise<{title:string, description:string, referencePrice:number|null}>}
   */
  async generateDraft(image) {
    // 图片只在内存中转为 data URL 转发给大模型，不落盘
    const dataUrl = `data:${image.mimetype};base64,${image.buffer.toString('base64')}`;
    const content = await chatCompletions({
      baseUrl: process.env.AI_API_BASE_URL,
      apiKey: process.env.AI_API_KEY,
      model: process.env.AI_MODEL,
      messages: buildDraftMessages(dataUrl),
      timeoutMs: 5000 // 契约：5 秒超时按 502 降级
    });
    return parseDraft(content);
  },

  /**
   * P1（可裁剪）：基于商品信息回答买家高频咨询。
   */
  async answerQuestion({ productId, question }) {
    // TODO: 拼装商品上下文 + 买家问题调用大模型；涉及价格/承诺的回复建议卖家确认
    throw new Error('not implemented');
  }
};

module.exports = aiService;
// 解析函数单独导出供单元测试直接覆盖（测试真实函数，不 mock）
module.exports.parseDraft = parseDraft;
