/**
 * 商品字段校验器（纯函数，不碰 req/res）。
 * 校验失败抛带 status=400 的 Error，交由全局 errorHandler 统一返回 400。
 *
 * 提取自 product.controller 的 createProduct / updateProduct —— 消除 6 处重复校验。
 * 风格与 parsePaging.js 一致：抛错带 status+code，由错误中间件兜底。
 *
 * 注意：title 校验未提取——createProduct（宽松：接受任意 truthy）与
 * updateProduct（严格：要求 string 类型）语义不同，强行合并反而改行为。
 */

/** 造一个 400 错误（与 parsePaging 抛错结构一致） */
function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  err.code = 400;
  return err;
}

/**
 * 价格：必须是非负有限数。失败抛 400「价格不合法」。
 * @param {*} raw
 * @returns {number}
 */
function validatePrice(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw badRequest('价格不合法');
  return n;
}

/**
 * 分类 id：必须是 ≥1 的整数。失败抛 400「请选择合法分类」。
 * @param {*} raw
 * @returns {number}
 */
function validateCategoryId(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) throw badRequest('请选择合法分类');
  return n;
}

/**
 * 参考价：未传/空串/null → null；给了就必须是非负有限数，否则抛 400「参考价不合法」。
 * @param {*} raw
 * @returns {number|null}
 */
function validateReferencePrice(raw) {
  // == 同时兜住 undefined（createProduct 未传）和 null（updateProduct 显式清空）
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) throw badRequest('参考价不合法');
  return n;
}

module.exports = { validatePrice, validateCategoryId, validateReferencePrice };
