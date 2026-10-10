const orderService = require('../services/order.service');
const ApiResponse = require('../utils/ApiResponse');

/**
 * 把入参解析为正整数；非法（缺失/NaN/负数/小数）返回 null。
 * 注意：必须先挡住非法格式，不能让 NaN 流进 SQL 再被误判成 409。
 */
function parsePositiveInt(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

exports.createOrder = async (req, res, next) => {
  try {
    const { productId: rawProductId, buyerId: rawBuyerId } = req.body || {};

    const productId = parsePositiveInt(rawProductId);
    if (!productId) {
      return res.status(400).json(ApiResponse.fail('productId 必须为正整数', 400));
    }

    // buyerId 可缺省（演示买家 2）；一旦给了就必须是正整数
    let buyerId = 2;
    if (rawBuyerId !== undefined && rawBuyerId !== null && String(rawBuyerId).trim() !== '') {
      buyerId = parsePositiveInt(rawBuyerId);
      if (!buyerId) {
        return res.status(400).json(ApiResponse.fail('buyerId 必须为正整数', 400));
      }
    }

    const result = await orderService.lockProduct({ productId, buyerId });
    res.status(201).json(ApiResponse.success(result, '下单成功，商品已锁定'));
  } catch (err) {
    next(err);
  }
};

exports.markDeal = async (req, res, next) => {
  try {
    const result = await orderService.markDeal(req.params.id);
    res.json(ApiResponse.success(result, '已标记成交'));
  } catch (err) {
    next(err);
  }
};
