const aiService = require('../services/ai.service');
const aiLogService = require('../services/aiLog.service');
const ApiResponse = require('../utils/ApiResponse');

/**
 * 上传照片 -> AI 生成标题/描述/参考价。
 * 返回的是草稿，前端必须进入可编辑页面，由卖家确认后再调 POST /api/products。
 */
exports.generateDraft = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json(ApiResponse.fail('请上传物品照片', 400));
    }
    const draft = await aiService.generateDraft(req.file);
    // C1 用法统计：成功记一条（output_text 存草稿 JSON）
    await aiLogService.logDraft({
      inputRef: `${req.file.mimetype} ${req.file.size}B`,
      outputText: JSON.stringify(draft)
    });
    res.json(ApiResponse.success(draft));
  } catch (err) {
    // 失败也记一条（output_text=NULL，input_ref 记原因），随后走统一错误处理。
    // AI 服务不可用不应阻断发布：前端可引导卖家手动填写
    if (req.file) {
      await aiLogService.logDraft({ inputRef: `失败：${err.message}`, outputText: null });
    }
    next(err);
  }
};

/** C1：AI 用法统计（调用量 + 估算成本累计） */
exports.getStats = async (req, res, next) => {
  try {
    res.json(ApiResponse.success(await aiLogService.getStats()));
  } catch (err) {
    next(err);
  }
};

exports.answerQuestion = async (req, res, next) => {
  try {
    // TODO(P1 可裁剪): 调用 aiService.answerQuestion(req.body)
    res.status(501).json(ApiResponse.fail('AI 应答待实现（P1）', 501));
  } catch (err) {
    next(err);
  }
};
