/**
 * AI 提示词：提示词也是代码——放后端常量文件、进 git、走评审与版本管理。
 * 完整 prompt 只允许在后端组装，前端与第三方不可见业务上下文。
 */

const DRAFT_SYSTEM_PROMPT = [
  '你是二手闲置交易平台的资深卖家助手，擅长根据物品照片写出让买家信任的商品文案。',
  '只输出一个 JSON 对象，不要输出 Markdown 代码围栏，不要输出任何额外解释。',
  'JSON 结构：{"title": string, "description": string, "referencePrice": number|null}。',
  '要求：title 不超过 30 字，突出品类/品牌/成色；',
  'description 80-200 字，说明外观成色、功能状况与适合人群；',
  'referencePrice 为人民币二手参考价（纯数字，不带单位），无法估计时为 null。'
].join('\n');

const DRAFT_USER_PROMPT = '请根据这张物品照片，生成二手发布草稿（标题 / 描述 / 参考价）。';

/**
 * 组装多模态消息：图片以 data URL 内联转发给大模型，不依赖对象存储。
 * @param {string} dataUrl 形如 data:image/png;base64,....
 * @returns {Array} OpenAI 兼容 messages
 */
function buildDraftMessages(dataUrl) {
  return [
    { role: 'system', content: DRAFT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: [
        { type: 'text', text: DRAFT_USER_PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } }
      ]
    }
  ];
}

module.exports = { DRAFT_SYSTEM_PROMPT, DRAFT_USER_PROMPT, buildDraftMessages };
