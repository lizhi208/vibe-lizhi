/**
 * 契约测试：严格按 docs/接口契约.md 覆盖每个端点的
 *   正常路径 ×1、边界 ×1、错误码全覆盖。
 *
 * 原则：
 *  - 连真实 MySQL（独立测试库 flea_market_test），不 mock 控制器/服务/SQL。
 *  - 每个 describe 组 before 重建库，组间互不污染。
 *  - DB_NAME 必须在 require('../src/app') 之前固定（db.js 加载时建池）。
 */
require('dotenv').config();
process.env.DB_NAME = process.env.TEST_DB_NAME || 'flea_market_test';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { resetTestDatabase } = require('./helpers/init-test-db');
const app = require('../src/app');
const pool = require('../src/config/db');

const api = () => request(app);

/** 发布一个商品（默认合法），返回 supertest 响应 */
async function publishProduct(overrides = {}) {
  return api()
    .post('/api/products')
    .send({
      title: '契约测试商品',
      price: 99.5,
      categoryId: 1,
      description: '描述',
      ...overrides
    });
}

/** 直接用 SQL 准备特定状态数据（绕过被测接口造夹具） */
async function execSql(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// ---------------------------------------------------------------------
// 1/2. health + categories
// ---------------------------------------------------------------------
describe('健康检查与分类', () => {
  before(resetTestDatabase);

  test('GET /api/health 返回 200 + pong', async () => {
    const res = await api().get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.equal(res.body.data, 'pong');
  });

  test('GET /api/categories 返回 5 个分类且按 sort_order 升序', async () => {
    const res = await api().get('/api/categories');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(res.body.data.length, 5);
    assert.deepEqual(
      res.body.data.map(c => c.id),
      [1, 2, 3, 4, 5]
    );
  });
});

// ---------------------------------------------------------------------
// 4. GET /api/products/page 分页契约
// ---------------------------------------------------------------------
describe('GET /api/products/page 分页', () => {
  before(async () => {
    await resetTestDatabase();
    // 3 个在架商品：分类 1 两个、分类 2 一个
    await publishProduct({ title: '苹果手机', categoryId: 1 });
    await publishProduct({ title: '苹果电脑', categoryId: 1 });
    await publishProduct({ title: '数据结构教材', categoryId: 2 });
    // 1 个已成交商品：不应出现在列表
    const sold = await publishProduct({ title: '已成交椅子', categoryId: 3 });
    await execSql("UPDATE products SET status='SOLD' WHERE id=?", [sold.body.data.id]);
  });

  test('正常：默认分页返回 list + pagination 结构', async () => {
    const res = await api().get('/api/products/page');
    assert.equal(res.status, 200);
    assert.equal(res.body.code, 0);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.size, 10);
    assert.equal(res.body.data.pagination.total, 3);
    assert.equal(res.body.data.pagination.totalPages, 1);
    assert.equal(res.body.data.list.length, 3);
  });

  test('边界：size=2 时两页数据不重叠，totalPages=2', async () => {
    const p1 = await api().get('/api/products/page?page=1&size=2');
    const p2 = await api().get('/api/products/page?page=2&size=2');
    assert.equal(p1.body.data.list.length, 2);
    assert.equal(p2.body.data.list.length, 1);
    assert.equal(p1.body.data.pagination.totalPages, 2);
    const ids1 = p1.body.data.list.map(x => x.id);
    const ids2 = p2.body.data.list.map(x => x.id);
    assert.equal(ids1.filter(id => ids2.includes(id)).length, 0, '两页 id 不得重叠');
  });

  test('排序：日期倒序（同时间戳以 id 倒序兜底）', async () => {
    const res = await api().get('/api/products/page?size=10');
    const ids = res.body.data.list.map(x => x.id);
    assert.deepEqual(ids, [...ids].sort((a, b) => b - a), 'id 应严格倒序');
  });

  test('过滤：keyword=苹果 命中 2 条；SOLD 商品永远不命中', async () => {
    const res = await api().get('/api/products/page?keyword=苹果');
    assert.equal(res.body.data.pagination.total, 2);
    assert.ok(res.body.data.list.every(x => x.title.includes('苹果')));

    const sold = await api().get('/api/products/page?keyword=椅子');
    assert.equal(sold.body.data.pagination.total, 0);
  });

  test('过滤：categoryId=2 命中 1 条', async () => {
    const res = await api().get('/api/products/page?categoryId=2');
    assert.equal(res.body.data.pagination.total, 1);
    assert.equal(res.body.data.list[0].title, '数据结构教材');
  });

  test('边界：超出实际页数返回 200 空列表（空页不是错误）', async () => {
    const res = await api().get('/api/products/page?page=999&size=10');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.list, []);
  });

  const badPage = ['0', '-1', 'abc', '1.5', '1e2', '0x1'];
  for (const v of badPage) {
    test(`错误码：page=${v} → 400 且 body.code=400`, async () => {
      const res = await api().get(`/api/products/page?page=${encodeURIComponent(v)}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 400);
    });
  }

  const badSize = [['0', 400], ['-2', 400], ['abc', 400], ['2.5', 400], ['51', 400]];
  for (const [v] of badSize) {
    test(`错误码：size=${v} → 400`, async () => {
      const res = await api().get(`/api/products/page?size=${encodeURIComponent(v)}`);
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 400);
    });
  }

  test('边界：空串 page= 视为未传，用默认值不报 400', async () => {
    const res = await api().get('/api/products/page?page=&size=');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.pagination.page, 1);
    assert.equal(res.body.data.pagination.size, 10);
  });
});

// ---------------------------------------------------------------------
// 5. GET /api/products/:id
// ---------------------------------------------------------------------
describe('商品详情', () => {
  let productId;
  before(async () => {
    await resetTestDatabase();
    const res = await publishProduct({ title: '详情商品' });
    productId = res.body.data.id;
  });

  test('正常：200 返回完整字段', async () => {
    const res = await api().get(`/api/products/${productId}`);
    assert.equal(res.status, 200);
    const fields = ['id', 'seller_id', 'category_id', 'title', 'price', 'status', 'created_at'];
    for (const f of fields) assert.ok(f in res.body.data, `缺字段 ${f}`);
    assert.equal(res.body.data.status, 'ON_SALE');
  });

  test('错误码：不存在 id → 404 且 body.code=404', async () => {
    const res = await api().get('/api/products/999999');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 404);
  });
});

// ---------------------------------------------------------------------
// 6. POST /api/products 发布
// ---------------------------------------------------------------------
describe('发布商品', () => {
  before(resetTestDatabase);

  test('正常：201，状态 ON_SALE', async () => {
    const res = await publishProduct({ title: '新发布商品', price: 1, referencePrice: 5 });
    assert.equal(res.status, 201);
    assert.equal(res.body.code, 0);
    assert.equal(res.body.data.status, 'ON_SALE');
    assert.equal(res.body.data.title, '新发布商品');
  });

  test('错误码：缺标题/空白标题 → 400', async () => {
    const r1 = await api().post('/api/products').send({ price: 10, categoryId: 1 });
    assert.equal(r1.status, 400);
    const r2 = await publishProduct({ title: '   ' });
    assert.equal(r2.status, 400);
  });

  test('错误码：价格为负/非数字 → 400', async () => {
    const r1 = await publishProduct({ price: -1 });
    assert.equal(r1.status, 400);
    const r2 = await publishProduct({ price: 'abc' });
    assert.equal(r2.status, 400);
  });

  test('错误码：缺 categoryId → 400', async () => {
    const res = await api().post('/api/products').send({ title: 'x', price: 10 });
    assert.equal(res.status, 400);
  });

  test('错误码：categoryId 指向不存在分类 → 400（外键约束不得变 500）', async () => {
    const res = await publishProduct({ categoryId: 999 });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 400);
  });
});

// ---------------------------------------------------------------------
// 7. PUT /api/products/:id 编辑
// ---------------------------------------------------------------------
describe('编辑商品', () => {
  let productId;
  before(async () => {
    await resetTestDatabase();
    productId = (await publishProduct()).body.data.id;
  });

  test('正常：200 改价生效', async () => {
    const res = await api().put(`/api/products/${productId}`).send({ price: 88 });
    assert.equal(res.status, 200);
    assert.equal(Number(res.body.data.price), 88);
  });

  test('边界：空 body 为 no-op，200 返回当前商品', async () => {
    const res = await api().put(`/api/products/${productId}`).send({});
    assert.equal(res.status, 200);
    assert.equal(Number(res.body.data.price), 88);
  });

  test('错误码：id 不存在 → 404', async () => {
    const res = await api().put('/api/products/999999').send({ price: 1 });
    assert.equal(res.status, 404);
  });

  test('错误码：负价格 → 400（不得落库）', async () => {
    const res = await api().put(`/api/products/${productId}`).send({ price: -50 });
    assert.equal(res.status, 400);
    const check = await api().get(`/api/products/${productId}`);
    assert.equal(Number(check.body.data.price), 88, '非法价格不得写入');
  });

  test('错误码：空白标题 → 400', async () => {
    const res = await api().put(`/api/products/${productId}`).send({ title: '' });
    assert.equal(res.status, 400);
  });

  test('错误码：categoryId 不存在 → 400（外键约束不得变 500）', async () => {
    const res = await api().put(`/api/products/${productId}`).send({ categoryId: 888 });
    assert.equal(res.status, 400);
  });
});

// ---------------------------------------------------------------------
// 8. POST /api/orders 下单锁定
// ---------------------------------------------------------------------
describe('下单锁定', () => {
  before(resetTestDatabase);

  test('正常：201，商品 ON_SALE→LOCKED', async () => {
    const p = (await publishProduct({ title: '可下单商品' })).body.data;
    const res = await api().post('/api/orders').send({ productId: p.id });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.status, 'LOCKED');
    assert.equal(res.body.data.productId, p.id);

    const detail = await api().get(`/api/products/${p.id}`);
    assert.equal(detail.body.data.status, 'LOCKED');
  });

  test('错误码：重复下单 → 409 且 body.code 必须为 409（不是 500）', async () => {
    const p = (await publishProduct({ title: '抢单商品' })).body.data;
    await api().post('/api/orders').send({ productId: p.id });
    const res = await api().post('/api/orders').send({ productId: p.id });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 409, '响应体 code 必须与 HTTP 状态码一致');
  });

  test('错误码：缺 productId → 400', async () => {
    const res = await api().post('/api/orders').send({});
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 400);
  });

  test('错误码：productId=abc（NaN）→ 400，不得报 409/500', async () => {
    const res = await api().post('/api/orders').send({ productId: 'abc' });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 400);
  });

  test('错误码：productId=-5（负数）→ 400', async () => {
    const res = await api().post('/api/orders').send({ productId: -5 });
    assert.equal(res.status, 400);
  });

  test('错误码：buyerId=abc → 400，不得 500', async () => {
    const p = (await publishProduct({ title: '坏买家参数' })).body.data;
    const res = await api().post('/api/orders').send({ productId: p.id, buyerId: 'abc' });
    assert.equal(res.status, 400);
  });

  test('错误码：buyerId=99999（不存在买家）→ 400，外键错误不得裸奔 500', async () => {
    const p = (await publishProduct({ title: '幽灵买家' })).body.data;
    const res = await api().post('/api/orders').send({ productId: p.id, buyerId: 99999 });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 400);
  });

  test('边界：productId 正整数但不存在 → 409（不可锁定）', async () => {
    const res = await api().post('/api/orders').send({ productId: 999999 });
    assert.equal(res.status, 409);
  });
});

// ---------------------------------------------------------------------
// 9. PATCH /api/orders/:id/deal 标记成交
// ---------------------------------------------------------------------
describe('标记成交', () => {
  before(resetTestDatabase);

  test('正常流程：下单→成交 200，商品 SOLD、订单 DEAL', async () => {
    const p = (await publishProduct({ title: '成交商品' })).body.data;
    const order = (await api().post('/api/orders').send({ productId: p.id })).body.data;

    const res = await api().patch(`/api/orders/${order.orderId}/deal`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'DEAL');

    const detail = await api().get(`/api/products/${p.id}`);
    assert.equal(detail.body.data.status, 'SOLD');
  });

  test('错误码：订单不存在 → 404', async () => {
    const res = await api().patch('/api/orders/999999/deal');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 404);
  });

  test('错误码：重复成交 → 409', async () => {
    const p = (await publishProduct({ title: '重复成交' })).body.data;
    const order = (await api().post('/api/orders').send({ productId: p.id })).body.data;
    await api().patch(`/api/orders/${order.orderId}/deal`);
    const res = await api().patch(`/api/orders/${order.orderId}/deal`);
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 409);
  });
});

// ---------------------------------------------------------------------
// 10/11. AI 接口
// ---------------------------------------------------------------------
describe('AI 接口', () => {
  before(resetTestDatabase);

  test('POST /api/ai/draft 未上传文件 → 400', async () => {
    const res = await api().post('/api/ai/draft');
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 400);
  });

  test('POST /api/ai/draft 非图片文件 → 400', async () => {
    const res = await api()
      .post('/api/ai/draft')
      .attach('image', Buffer.from('hello not image'), { filename: 'note.txt', contentType: 'text/plain' });
    assert.equal(res.status, 400);
  });

  test('POST /api/ai/draft 超大文件 → 400', async () => {
    const big = Buffer.alloc(6 * 1024 * 1024, 0x89); // 6MB > 5MB 限制
    const res = await api()
      .post('/api/ai/draft')
      .attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
  });

  test('POST /api/ai/answer 未实现 → 501', async () => {
    const res = await api().post('/api/ai/answer').send({ productId: 1, question: 'q' });
    assert.equal(res.status, 501);
    assert.equal(res.body.code, 501);
  });
});

// ---------------------------------------------------------------------
// 12-14. 统计
// ---------------------------------------------------------------------
describe('统计接口', () => {
  before(resetTestDatabase);

  test('GET /api/stats/overview 结构与数字类型', async () => {
    await publishProduct({ title: '统计A', categoryId: 1 });
    const res = await api().get('/api/stats/overview');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.total, 'number');
    assert.ok(Array.isArray(res.body.data.byCategory));
    assert.ok(Array.isArray(res.body.data.byStatus));
    const cat1 = res.body.data.byCategory.find(x => x.name === '数码电子');
    assert.equal(cat1.value, 1);
    assert.equal(typeof cat1.value, 'number');
  });

  test('POST /api/stats/visit 同 path 访问量累加', async () => {
    await api().post('/api/stats/visit').send({ path: '/demo-page' });
    const res = await api().post('/api/stats/visit').send({ path: '/demo-page' });
    const row = res.body.data.find(x => x.path === '/demo-page');
    assert.ok(row, '应返回该 path 统计');
    assert.equal(row.views, 2);
  });

  test('POST /api/stats/visit 缺 path 记为 /；GET /visits 为数组', async () => {
    await api().post('/api/stats/visit').send({});
    const res = await api().get('/api/stats/visits');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.some(x => x.path === '/'));
  });
});

// ---------------------------------------------------------------------
// 15. 404
// ---------------------------------------------------------------------
describe('未匹配路由', () => {
  test('GET 不存在的 /api 路径 → 404 JSON 含 path', async () => {
    const res = await api().get('/api/no-such-endpoint');
    assert.equal(res.status, 404);
    assert.equal(res.body.code, 404);
    assert.equal(res.body.data.path, '/api/no-such-endpoint');
  });
});

// 全部测试结束后关闭连接池，避免事件循环挂住导致进程不退出
after(async () => {
  await pool.end();
});
