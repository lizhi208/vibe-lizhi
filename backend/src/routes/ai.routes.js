/**
 * AI 卖家助手接口：只调用第三方大模型，输出均为「草稿建议」。
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/ai.controller');

// 图片进内存即可（只转发给大模型，不落盘）。
// 护栏：限 5MB、仅图片；超限/错误类型由全局错误处理统一转 400。
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (/^image\//.test(file.mimetype)) {
      return cb(null, true);
    }
    const err = new Error('只允许上传图片文件（image/*）');
    err.status = 400;
    err.type = 'multer';
    cb(err);
  }
});

// POST /api/ai/draft   上传物品照片 -> 返回标题+描述+参考报价（可编辑草稿）
router.post('/draft', upload.single('image'), aiController.generateDraft);

// POST /api/ai/answer  （P1 可裁剪）买家咨询 AI 应答
router.post('/answer', aiController.answerQuestion);

module.exports = router;
