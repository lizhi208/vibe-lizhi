/**
 * 关键单测（纯函数层，不连数据库）——覆盖策略由人定：
 *   接口层已由 api.contract.test.js（52 条，连真实 MySQL）覆盖；
 *   本文件只锁"最容易回归"的纯逻辑：
 *     1. errorHandler 错误映射矩阵（day5 修复核心：状态码归一 + 外键/唯一键/multer 映射）
 *     2. notFound 404 响应结构
 *     3. parsePaging 分页解析全分支
 *     4. ApiResponse 统一响应结构
 */
const { describe, test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const errorHandler = require('../src/middlewares/errorHandler');
const notFound = require('../src/middlewares/notFound');
const parsePaging = require('../src/utils/parsePaging');
const ApiResponse = require('../src/utils/ApiResponse');

/** 造一个记录调用的假 res（只 mock 传输层，不 mock 被测逻辑） */
function fakeRes() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
}

// ---------------------------------------------------------------------
// 1. errorHandler 错误映射矩阵
// ---------------------------------------------------------------------
describe('errorHandler 错误映射矩阵', () => {
  // 评审裁决：不给 errorHandler 写 err=null 用例——Express 4 router 只在 err 为真值时
  // 才调错误中间件（next(null)/next() 都走正常流程），框架保证下收不到空值，防了就是过度生成。
  beforeEach((t) => {
    // 兜底分支会 console.error，静音避免污染测试输出
    t.mock.method(console, 'error', () => {});
  });

  test('MySQL 外键错误 ER_NO_REFERENCED_ROW_2 → 400（幽灵买家回归）', () => {
    const res = fakeRes();
    errorHandler({ code: 'ER_NO_REFERENCED_ROW_2' }, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 400);
    assert.equal(res.body.message, '关联数据不存在（外键约束）');
  });

  test('MySQL 外键错误 ER_ROW_IS_REFERENCED_2 → 400', () => {
    const res = fakeRes();
    errorHandler({ code: 'ER_ROW_IS_REFERENCED_2' }, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 400);
  });

  test('MySQL 唯一键冲突 ER_DUP_ENTRY → 409（重复下单回归）', () => {
    const res = fakeRes();
    errorHandler({ code: 'ER_DUP_ENTRY' }, {}, res, () => {});
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 409);
    assert.equal(res.body.message, '数据重复冲突');
  });

  test('MulterError（如文件超限）→ 400 且透传 multer 文案', () => {
    const res = fakeRes();
    const err = new Error('File too large');
    err.name = 'MulterError';
    errorHandler(err, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 400);
    assert.equal(res.body.message, 'File too large');
  });

  test('fileFilter 拒绝（status=400 + type=multer）→ 400', () => {
    const res = fakeRes();
    errorHandler({ status: 400, type: 'multer', message: '仅支持图片' }, {}, res, () => {});
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, '仅支持图片');
  });

  test('状态码归一（day5 P0-1 回归）：status=409 + code=500 → HTTP 409 且 body.code=409', () => {
    // 修复前：HTTP 取 status=409，body.code 取 err.code=500，客户端全部误判成服务器错误
    const res = fakeRes();
    errorHandler({ status: 409, code: 500, message: '已被锁定' }, {}, res, () => {});
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 409);
  });

  test('字符串 code 不能当 HTTP 状态码：code=ER_LOCK_DEADLOCK → 500', () => {
    const res = fakeRes();
    errorHandler({ code: 'ER_LOCK_DEADLOCK', message: 'deadlock' }, {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, 500);
  });

  test('整数 code 兜底（无 status）→ 透传该整数', () => {
    const res = fakeRes();
    errorHandler({ code: 423, message: 'locked' }, {}, res, () => {});
    assert.equal(res.statusCode, 423);
    assert.equal(res.body.code, 423);
  });

  test('无 status/code 的裸错误 → 500 + 默认文案', () => {
    const res = fakeRes();
    errorHandler(new Error('boom'), {}, res, () => {});
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.code, 500);
    assert.equal(res.body.message, 'boom');
  });

  test('err 无 message → 500 + 兜底文案「服务器内部错误」', () => {
    const res = fakeRes();
    errorHandler({ status: 418 }, {}, res, () => {});
    assert.equal(res.statusCode, 418);
    assert.equal(res.body.message, '服务器内部错误');
  });

  test('业务 404 透传：status=404 + message=订单不存在', () => {
    const res = fakeRes();
    errorHandler({ status: 404, message: '订单不存在' }, {}, res, () => {});
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 404);
    assert.equal(res.body.message, '订单不存在');
  });
});

// ---------------------------------------------------------------------
// 2. notFound 404 结构
// ---------------------------------------------------------------------
describe('notFound 404 响应结构', () => {
  test('返回 404 + code 404 + data.path 回显原始路径', () => {
    const res = fakeRes();
    notFound({ originalUrl: '/api/nope' }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(res.body.code, 404);
    assert.equal(res.body.message, '接口不存在');
    assert.equal(res.body.data.path, '/api/nope');
  });

  test('带查询串的路径原样回显', () => {
    const res = fakeRes();
    notFound({ originalUrl: '/api/nope?x=1' }, res);
    assert.equal(res.body.data.path, '/api/nope?x=1');
  });
});

// ---------------------------------------------------------------------
// 3. parsePaging 全分支
// ---------------------------------------------------------------------
describe('parsePaging 分页解析', () => {
  test('空 query → 默认 page=1 size=10 offset=0', () => {
    assert.deepEqual(parsePaging({}), { page: 1, size: 10, offset: 0 });
  });

  test('字符串数字正常解析并算出 offset', () => {
    assert.deepEqual(parsePaging({ page: '3', size: '5' }), { page: 3, size: 5, offset: 10 });
  });

  test('空串视为未传，用默认值', () => {
    assert.deepEqual(parsePaging({ page: '', size: '' }), { page: 1, size: 10, offset: 0 });
  });

  test('page=abc → 抛 400，message 指明字段名', () => {
    assert.throws(() => parsePaging({ page: 'abc' }), (e) =>
      e.status === 400 && e.code === 400 && /page/.test(e.message));
  });

  test('page=-1 → 抛 400（负数天然被纯数字正则排除）', () => {
    assert.throws(() => parsePaging({ page: '-1' }), (e) => e.status === 400);
  });

  test('page=1.5 → 抛 400（小数拒绝）', () => {
    assert.throws(() => parsePaging({ page: '1.5' }), (e) => e.status === 400);
  });

  test('page=0 → 抛 400（必须 ≥1）', () => {
    assert.throws(() => parsePaging({ page: '0' }), (e) => e.status === 400);
  });

  test('超出安全整数的大数 → 抛 400', () => {
    assert.throws(() => parsePaging({ page: '99999999999999999999' }), (e) => e.status === 400);
  });

  test('size 超过默认 maxSize=50 → 抛 400 且文案带上限值', () => {
    assert.throws(() => parsePaging({ size: '999' }), (e) =>
      e.status === 400 && /50/.test(e.message));
  });

  test('自定义 defaultSize/maxSize 生效', () => {
    assert.deepEqual(parsePaging({}, { defaultSize: 20 }), { page: 1, size: 20, offset: 0 });
    assert.deepEqual(parsePaging({ size: '30' }, { maxSize: 30 }), { page: 1, size: 30, offset: 0 });
    assert.throws(() => parsePaging({ size: '31' }, { maxSize: 30 }), (e) =>
      e.status === 400 && /30/.test(e.message));
  });

  test('offset 计算：page=4 size=25 → 75', () => {
    assert.equal(parsePaging({ page: '4', size: '25' }).offset, 75);
  });

  test('size=abc 同样抛 400', () => {
    assert.throws(() => parsePaging({ size: 'abc' }), (e) =>
      e.status === 400 && /size/.test(e.message));
  });
});

// ---------------------------------------------------------------------
// 4. ApiResponse 统一响应结构
// ---------------------------------------------------------------------
describe('ApiResponse 响应结构', () => {
  test('success() 默认 {code:0, message:"ok", data:null}', () => {
    assert.deepEqual(ApiResponse.success(), { code: 0, message: 'ok', data: null });
  });

  test('success(data) 数据透传 + 默认文案', () => {
    const r = ApiResponse.success({ id: 1 });
    assert.equal(r.code, 0);
    assert.deepEqual(r.data, { id: 1 });
    assert.equal(r.message, 'ok');
  });

  test('success(data, message) 自定义文案', () => {
    assert.equal(ApiResponse.success(null, '发布成功').message, '发布成功');
  });

  test('fail() 默认 {code:1, message:"error", data:null}', () => {
    assert.deepEqual(ApiResponse.fail(), { code: 1, message: 'error', data: null });
  });

  test('fail(message, code, data) 三参齐全', () => {
    assert.deepEqual(
      ApiResponse.fail('接口不存在', 404, { path: '/x' }),
      { code: 404, message: '接口不存在', data: { path: '/x' } }
    );
  });
});
