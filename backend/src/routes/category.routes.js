/**
 * 分类接口。
 */
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');

// GET /api/categories 全部分类
router.get('/', categoryController.listCategories);

module.exports = router;
