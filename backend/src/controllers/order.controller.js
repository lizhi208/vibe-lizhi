const orderService = require('../services/order.service');
const ApiResponse = require('../utils/ApiResponse');

exports.createOrder = async (req, res, next) => {
  try {
    const { productId, buyerId } = req.body;
    if (!productId) {
      return res.status(400).json(ApiResponse.fail('缺少 productId', 400));
    }
    const result = await orderService.lockProduct({
      productId: Number(productId),
      buyerId: buyerId ? Number(buyerId) : 2
    });
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
