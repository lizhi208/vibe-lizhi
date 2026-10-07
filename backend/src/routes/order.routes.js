/**
 * 订单接口：下单锁定 / 标记成交 / 取消（本期不做支付、物流）。
 */
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');

// POST /api/orders            下单：商品 在售(ON_SALE) -> 已锁定(LOCKED)
router.post('/', orderController.createOrder);

// PATCH /api/orders/:id/deal  标记成交：已锁定(LOCKED) -> 已成交(SOLD)
router.patch('/:id/deal', orderController.markDeal);

module.exports = router;
