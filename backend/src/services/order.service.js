const pool = require('../config/db');

/**
 * 下单与状态流转：ON_SALE -> LOCKED -> SOLD。
 * 本期不做支付、物流；成交只改状态。
 */
const orderService = {
  /**
   * 下单锁定。
   * 条件 UPDATE 保证原子性：只有 ON_SALE 能被锁定，
   * affectedRows === 0 说明已被锁定/成交，拒绝下单（防重复下单）。
   */
  async lockProduct({ productId, buyerId = 2 }) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        "UPDATE products SET status = 'LOCKED' WHERE id = ? AND status = 'ON_SALE'",
        [productId]
      );
      if (result.affectedRows === 0) {
        await conn.rollback();
        const err = new Error('商品已被锁定或已成交，无法下单');
        err.status = 409;
        throw err;
      }

      const [orderResult] = await conn.execute(
        "INSERT INTO orders (product_id, buyer_id, status) VALUES (?, ?, 'LOCKED')",
        [productId, buyerId]
      );
      await conn.commit();

      return { orderId: orderResult.insertId, productId: Number(productId), status: 'LOCKED' };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /**
   * 标记成交：订单 LOCKED -> DEAL，商品 LOCKED -> SOLD。
   */
  async markDeal(orderId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [orders] = await conn.execute(
        'SELECT id, product_id, status FROM orders WHERE id = ? FOR UPDATE',
        [orderId]
      );
      if (orders.length === 0) {
        await conn.rollback();
        const err = new Error('订单不存在');
        err.status = 404;
        throw err;
      }
      if (orders[0].status !== 'LOCKED') {
        await conn.rollback();
        const err = new Error('订单当前状态不可标记成交');
        err.status = 409;
        throw err;
      }

      const productId = orders[0].product_id;
      const [upd] = await conn.execute(
        "UPDATE products SET status = 'SOLD' WHERE id = ? AND status = 'LOCKED'",
        [productId]
      );
      if (upd.affectedRows === 0) {
        await conn.rollback();
        const err = new Error('商品状态异常，无法成交');
        err.status = 409;
        throw err;
      }

      await conn.execute("UPDATE orders SET status = 'DEAL' WHERE id = ?", [orderId]);
      await conn.commit();

      return { orderId: Number(orderId), productId, status: 'DEAL' };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  }
};

module.exports = orderService;
