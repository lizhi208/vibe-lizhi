const pool = require('../config/db');

/**
 * 统计数据访问层：供 ECharts 看板使用。
 * SQL 集中在 service，控制器不写 SQL。
 */
const statsService = {
  /**
   * 商品总览：分类分布 + 状态分布。
   * 分类分布：每个分类下在架（ON_SALE/LOCKED）商品数，用于饼图。
   * 状态分布：各状态商品数，用于柱状图。
   */
  async overview() {
    const [byCategory] = await pool.query(
      `SELECT c.name AS name, COUNT(p.id) AS value
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.status IN ('ON_SALE', 'LOCKED')
       GROUP BY c.id, c.name
       ORDER BY value DESC`
    );

    const [byStatus] = await pool.query(
      `SELECT status, COUNT(*) AS count FROM products GROUP BY status`
    );

    const [totalRow] = await pool.query(`SELECT COUNT(*) AS total FROM products`);

    return {
      total: Number(totalRow[0].total),
      byCategory: byCategory.map(r => ({ name: r.name, value: Number(r.value) })),
      byStatus: byStatus.map(r => ({ status: r.status, count: Number(r.count) }))
    };
  },

  /**
   * 记录一次访问（访问统计）。
   * 表 page_views(path, views, updated_at)，按 path 累加。
   */
  async trackVisit(path) {
    const p = String(path || '/').slice(0, 200);
    await pool.execute(
      `INSERT INTO page_views (path, views) VALUES (?, 1)
       ON DUPLICATE KEY UPDATE views = views + 1, updated_at = CURRENT_TIMESTAMP`,
      [p]
    );
  },

  /** 读取各页面访问量（降序）。 */
  async visits() {
    const [rows] = await pool.query(
      `SELECT path, views FROM page_views ORDER BY views DESC LIMIT 20`
    );
    return rows.map(r => ({ path: r.path, views: Number(r.views) }));
  }
};

module.exports = statsService;
