const pool = require('../config/db');

/**
 * 商品数据访问层：所有 SQL 集中在 service。
 */
const productService = {
  /**
   * 列表 / 搜索 / 分类筛选。
   * 演示期默认只展示在架商品（ON_SALE/LOCKED），已成交不进列表。
   */
  async listProducts({ keyword, categoryId }) {
    const conditions = ["status IN ('ON_SALE', 'LOCKED')"];
    const params = [];

    if (keyword) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (categoryId) {
      conditions.push('category_id = ?');
      params.push(categoryId);
    }

    const [rows] = await pool.query(
      `SELECT id, title, price, image_url, status, created_at
       FROM products WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC LIMIT 50`,
      params
    );
    return rows;
  },

  async getProduct(id) {
    const [rows] = await pool.query(
      `SELECT id, seller_id, category_id, title, description, image_url,
              price, reference_price, status, created_at
       FROM products WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async createProduct(data) {
    const {
      sellerId = 1, // 骨架期无登录，默认演示卖家
      categoryId,
      title,
      description = '',
      imageUrl = '',
      price,
      referencePrice = null
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO products
         (seller_id, category_id, title, description, image_url, price, reference_price, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ON_SALE')`,
      [sellerId, categoryId, title, description, imageUrl, price, referencePrice]
    );
    return this.getProduct(result.insertId);
  },

  async updateProduct(id, data) {
    const fields = [];
    const params = [];
    ['title', 'description', 'image_url', 'price', 'category_id', 'reference_price'].forEach(key => {
      const mapped = { image_url: 'imageUrl', category_id: 'categoryId', reference_price: 'referencePrice' }[key] || key;
      if (data[mapped] !== undefined) {
        fields.push(`${key} = ?`);
        params.push(data[mapped]);
      }
    });
    if (fields.length === 0) return this.getProduct(id);

    params.push(id);
    await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
    return this.getProduct(id);
  }
};

module.exports = productService;
