/**
 * AI 服务：只封装对第三方大模型 API 的调用，本项目不训练模型。
 * 配置见 backend/.env：AI_API_BASE_URL / AI_API_KEY / AI_MODEL
 */
const axios = require('axios');

const aiService = {
  /**
   * 根据物品照片生成发布草稿。
   * @param {File} image multer memoryStorage 取出的图片文件
   * @returns {Promise<{title:string, description:string, referencePrice:number|null}>}
   */
  async generateDraft(image) {
    // TODO: 按所选大模型的接口协议组装多模态请求
    // 1. 图片转 base64：image.buffer.toString('base64')
    // 2. prompt 要求同时输出：标题、描述文案、同类二手参考价
    // 3. 解析返回 JSON；失败时给出明确错误，由前端引导卖家手填
    //
    // 示例（以 OpenAI 兼容协议为例，按实际供应商调整）：
    // const resp = await axios.post(
    //   `${process.env.AI_API_BASE_URL}/chat/completions`,
    //   { model: process.env.AI_MODEL, messages: [/* ... */] },
    //   { headers: { Authorization: `Bearer ${process.env.AI_API_KEY}` }, timeout: 20000 }
    // );
    throw new Error('AI 草稿生成待接入第三方 API');
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
