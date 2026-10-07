const pool = require('../config/db');

/**
 * 分类数据访问。
 */
const categoryService = {
  async listCategories() {
    const [rows] = await pool.query(
      'SELECT id, name, sort_order FROM categories ORDER BY sort_order, id'
    );
    return rows;
  }
};

module.exports = categoryService;
