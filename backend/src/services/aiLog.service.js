/**
 * AI 调用日志与用法统计（C1）：数据源 ai_generation_logs 表。
 * 口径（契约 §16）：每次 /api/ai/draft 调用记 1 行；
 * 成功 output_text = 草稿 JSON，失败 output_text = NULL 且 input_ref 记失败原因。
 */
const pool = require('../config/db');

// 单次成功调用的估算成本（元），口径与假设见 docs/AI成本估算.md
const ESTIMATED_COST_PER_CALL = 0.0031;

/** 记录一次 /api/ai/draft 调用。日志写入失败绝不阻断主流程，只记 console。 */
async function logDraft({ inputRef, outputText }) {
  try {
    await pool.query(
      'INSERT INTO ai_generation_logs (type, input_ref, output_text) VALUES (?, ?, ?)',
      ['DRAFT', String(inputRef || '').slice(0, 500), outputText == null ? null : String(outputText)]
    );
  } catch (e) {
    console.error('[ai-log] 写入失败（不影响主流程）:', e.message);
  }
}

/** 用法统计：调用量（成功/失败）+ 估算成本累计 */
async function getStats() {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS totalCalls,
            SUM(CASE WHEN output_text IS NOT NULL THEN 1 ELSE 0 END) AS successCalls
     FROM ai_generation_logs
     WHERE type = 'DRAFT'`
  );
  const totalCalls = Number(rows[0].totalCalls) || 0;
  const successCalls = Number(rows[0].successCalls) || 0;
  const failedCalls = totalCalls - successCalls;
  const estimatedCost = Number((successCalls * ESTIMATED_COST_PER_CALL).toFixed(4));
  return { totalCalls, successCalls, failedCalls, estimatedCost };
}

module.exports = { logDraft, getStats, ESTIMATED_COST_PER_CALL };
