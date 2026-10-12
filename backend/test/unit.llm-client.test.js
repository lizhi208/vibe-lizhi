/**
 * 单元测试：LLM 封装层（llm.client）与草稿解析（ai.service.parseDraft）。
 *
 * 原则：用「注入假 HTTP POST」覆盖网络分支，不 mock 被测逻辑本身；
 * 全程不发起真实外部请求（不花钱、不受网络影响、可离线运行）。
 */
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const { chatCompletions, isConfigured } = require('../src/services/llm.client');
const { parseDraft } = require('../src/services/ai.service');

const BASE_CFG = {
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  apiKey: 'sk-real-key',
  model: 'qwen-vl-max',
  messages: [{ role: 'user', content: 'hi' }]
};

/** 构造一个记录调用次数/参数的假 post，可指定行为 */
function fakePost(behavior) {
  const calls = [];
  const fn = async (url, body, opts) => {
    calls.push({ url, body, opts });
    if (behavior.throw) throw behavior.throw;
    return behavior.return;
  };
  fn.calls = calls;
  return fn;
}

// ---------------------------------------------------------------------
// isConfigured：占位符识别
// ---------------------------------------------------------------------
describe('llm.client isConfigured', () => {
  test('空值与占位符视为未配置；真实 Key 视为已配置', () => {
    assert.equal(isConfigured(''), false);
    assert.equal(isConfigured('  '), false);
    assert.equal(isConfigured('your_api_key'), false);
    assert.equal(isConfigured(undefined), false);
    assert.equal(isConfigured('sk-abc123'), true);
  });
});

// ---------------------------------------------------------------------
// chatCompletions 降级分支（契约 §10：统一 502）
// ---------------------------------------------------------------------
describe('llm.client chatCompletions 降级', () => {
  test('未配置 Key → 502，且不发起任何外部请求', async () => {
    const post = fakePost({ return: {} });
    await assert.rejects(
      chatCompletions({ ...BASE_CFG, apiKey: 'your_api_key' }, post),
      err => err.status === 502 && err.message.includes('未配置')
    );
    assert.equal(post.calls.length, 0, '未配置时绝不发外部请求');
  });

  test('超时（ECONNABORTED）→ 502 且文案含「超时」', async () => {
    const err = new Error('timeout of 5000ms exceeded');
    err.code = 'ECONNABORTED';
    const post = fakePost({ throw: err });
    await assert.rejects(
      chatCompletions(BASE_CFG, post),
      e => e.status === 502 && e.message.includes('超时')
    );
  });

  test('断网（ENOTFOUND，无 response）→ 502 且文案含「不可达」', async () => {
    const err = new Error('getaddrinfo ENOTFOUND api.example.com');
    err.code = 'ENOTFOUND';
    const post = fakePost({ throw: err });
    await assert.rejects(
      chatCompletions(BASE_CFG, post),
      e => e.status === 502 && e.message.includes('不可达')
    );
  });

  test('上游非 2xx（如欠费/限流 500）→ 502 且带上游状态码', async () => {
    const err = new Error('Request failed with status code 500');
    err.response = { status: 500 };
    const post = fakePost({ throw: err });
    await assert.rejects(
      chatCompletions(BASE_CFG, post),
      e => e.status === 502 && e.message.includes('500')
    );
  });

  test('上游 200 但 choices 结构缺失 → 502「内容为空」', async () => {
    const post = fakePost({ return: { data: { choices: [] } } });
    await assert.rejects(
      chatCompletions(BASE_CFG, post),
      e => e.status === 502 && e.message.includes('为空')
    );
  });

  test('正常路径：返回 content 文本，且请求头带 Bearer、URL 正确', async () => {
    const post = fakePost({
      return: { data: { choices: [{ message: { content: '{"title":"x"}' } }] } }
    });
    const content = await chatCompletions(BASE_CFG, post);
    assert.equal(content, '{"title":"x"}');
    assert.equal(post.calls.length, 1);
    const { url, opts } = post.calls[0];
    assert.equal(url, `${BASE_CFG.baseUrl}/chat/completions`);
    assert.equal(opts.headers.Authorization, `Bearer ${BASE_CFG.apiKey}`);
    assert.equal(opts.timeout, 5000, '契约：默认 5 秒超时');
  });
});

// ---------------------------------------------------------------------
// parseDraft：AI 输出解析（输出不稳定是已知风险，解析失败也按 502 降级）
// ---------------------------------------------------------------------
describe('ai.service parseDraft', () => {
  test('正常：纯 JSON → 草稿对象', () => {
    const draft = parseDraft('{"title":"九成新台灯","description":"功能正常","referencePrice":35}');
    assert.deepEqual(draft, { title: '九成新台灯', description: '功能正常', referencePrice: 35 });
  });

  test('正常：容忍 ```json 代码围栏', () => {
    const draft = parseDraft('```json\n{"title":"书","description":"干净","referencePrice":null}\n```');
    assert.equal(draft.title, '书');
    assert.equal(draft.referencePrice, null);
  });

  test('边界：referencePrice 非法（负数/非数字）→ 归 null', () => {
    const d1 = parseDraft('{"title":"t","description":"d","referencePrice":-5}');
    assert.equal(d1.referencePrice, null);
    const d2 = parseDraft('{"title":"t","description":"d","referencePrice":"面议"}');
    assert.equal(d2.referencePrice, null);
  });

  test('错误：非 JSON → 502「无法解析」', () => {
    assert.throws(
      () => parseDraft('这是一段自然语言回答'),
      err => err.status === 502 && err.message.includes('无法解析')
    );
  });

  test('错误：缺标题/描述字段 → 502「缺字段」', () => {
    assert.throws(
      () => parseDraft('{"title":"","description":"d"}'),
      err => err.status === 502 && err.message.includes('缺')
    );
  });
});
