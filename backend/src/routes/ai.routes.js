/**
 * AI 卖家助手接口：只调用第三方大模型，输出均为「草稿建议」。
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/ai.controller');

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/ai/draft   上传物品照片 -> 返回标题+描述+参考报价（可编辑草稿）
router.post('/draft', upload.single('image'), aiController.generateDraft);

// POST /api/ai/answer  （P1 可裁剪）买家咨询 AI 应答
router.post('/answer', aiController.answerQuestion);

module.exports = router;
