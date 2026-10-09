/**
 * 路由聚合：所有业务接口统一以 /api 开头。
 */
const express = require('express');
const router = express.Router();

const productRoutes = require('./product.routes');
const categoryRoutes = require('./category.routes');
const orderRoutes = require('./order.routes');
const aiRoutes = require('./ai.routes');
const statsRoutes = require('./stats.routes');

router.get('/health', (req, res) => res.json({ code: 0, message: 'ok', data: 'pong' }));

router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/ai', aiRoutes);
router.use('/stats', statsRoutes);

module.exports = router;
