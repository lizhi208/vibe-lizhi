/**
 * 分页参数解析与校验。
 * page/size 必须是正整数；非法（空串除外，用默认值）一律抛 400。
 *
 * @param {object} query req.query
 * @param {{defaultSize?:number, maxSize?:number}} [opts]
 * @returns {{page:number, size:number, offset:number}}
 */
function parsePaging(query, opts = {}) {
  const defaultSize = opts.defaultSize ?? 10;
  const maxSize = opts.maxSize ?? 50;

  const parsePositiveInt = (raw, name, fallback) => {
    // 未传或空串：用默认值，不视为非法
    if (raw === undefined || raw === null || raw === '') return fallback;
    // 只接受纯数字（天然排除负数、小数、abc、1e2 等）
    if (!/^\d+$/.test(String(raw))) {
      const err = new Error(`${name} 必须是正整数`);
      err.status = 400;
      err.code = 400;
      throw err;
    }
    const n = parseInt(raw, 10);
    if (!Number.isSafeInteger(n) || n < 1) {
      const err = new Error(`${name} 必须是正整数`);
      err.status = 400;
      err.code = 400;
      throw err;
    }
    return n;
  };

  const page = parsePositiveInt(query.page, 'page', 1);
  let size = parsePositiveInt(query.size, 'size', defaultSize);
  if (size > maxSize) {
    const err = new Error(`size 最大为 ${maxSize}`);
    err.status = 400;
    err.code = 400;
    throw err;
  }

  return { page, size, offset: (page - 1) * size };
}

module.exports = parsePaging;
