/**
 * 商品接口：发布(CRUD) / 列表 / 搜索 / 分类 / 详情。
 */
const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');

// GET /api/products          列表，支持 ?keyword=&categoryId=
router.get('/', productController.listProducts);

// GET /api/products/:id      商品详情
router.get('/:id', productController.getProduct);

// POST /api/products         发布商品（卖家确认草稿后调用）
router.post('/', productController.createProduct);

// PUT /api/products/:id      编辑商品
router.put('/:id', productController.updateProduct);

module.exports = router;
