-- =====================================================================
-- 二手集市 + AI 卖家助手 —— MySQL 建库建表脚本（骨架）
-- 适用 MySQL 8.x；字符集 utf8mb4
-- 用法：mysql -u root -p < database/schema.sql
-- =====================================================================

CREATE DATABASE IF NOT EXISTS flea_market_ai
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE flea_market_ai;

-- 重建期临时关闭外键检查，避免 DROP TABLE 顺序冲突
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------
-- 1. 用户表（卖家 / 买家）
--    骨架期不做登录鉴权，seller_id / buyer_id 可先写死；保留字段便于扩展
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL COMMENT '登录名',
  password_hash VARCHAR(100) NOT NULL DEFAULT '' COMMENT '密码哈希（骨架期为空）',
  nickname      VARCHAR(50)  NOT NULL DEFAULT '' COMMENT '昵称',
  role          ENUM('SELLER', 'BUYER') NOT NULL DEFAULT 'BUYER' COMMENT '角色',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ---------------------------------------------------------------------
-- 2. 商品分类表
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(50) NOT NULL COMMENT '分类名称',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '展示排序',
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- ---------------------------------------------------------------------
-- 3. 商品表
--    状态机：ON_SALE 在售 -> LOCKED 已锁定 -> SOLD 已成交
--    状态以字符串枚举存储，前后端共用同一套字面量
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  seller_id       BIGINT UNSIGNED NOT NULL COMMENT '发布者（users.id）',
  category_id     BIGINT UNSIGNED NOT NULL COMMENT '分类（categories.id）',
  title           VARCHAR(100) NOT NULL COMMENT '标题（卖家确认后的最终稿）',
  description     TEXT NULL COMMENT '详情描述（卖家确认后的最终稿）',
  image_url       VARCHAR(500) NOT NULL DEFAULT '' COMMENT '物品图片地址',
  price           DECIMAL(10,2) NOT NULL COMMENT '最终售价（卖家可覆盖 AI 参考价）',
  reference_price DECIMAL(10,2) NULL COMMENT 'AI 给出的参考报价（仅参考）',
  status          ENUM('ON_SALE', 'LOCKED', 'SOLD')
                  NOT NULL DEFAULT 'ON_SALE' COMMENT '在售/已锁定/已成交',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_seller (seller_id),
  KEY idx_category_status (category_id, status),
  KEY idx_status_created (status, created_at),
  FULLTEXT KEY ft_title_desc (title, description) /*!80000 WITH PARSER ngram */
                    COMMENT '全文索引用于搜索（MySQL 8 + ngram）；不可用时退回 LIKE',
  CONSTRAINT fk_products_seller   FOREIGN KEY (seller_id)   REFERENCES users(id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- ---------------------------------------------------------------------
-- 4. 订单表（下单锁定 / 标记成交；本期不做支付、物流）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  buyer_id   BIGINT UNSIGNED NOT NULL,
  status     ENUM('LOCKED', 'DEAL', 'CANCELLED')
             NOT NULL DEFAULT 'LOCKED' COMMENT '已锁定/已成交/已取消',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product (product_id),
  KEY idx_buyer (buyer_id),
  CONSTRAINT fk_orders_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_orders_buyer   FOREIGN KEY (buyer_id)   REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表（仅状态流转，无支付物流）';

-- ---------------------------------------------------------------------
-- 5. AI 生成记录表（便于排查“AI 输出不稳定”问题；可选）
--    type：DRAFT 标题描述+报价 / ANSWER 买家咨询应答（P1）
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS ai_generation_logs;
CREATE TABLE ai_generation_logs (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id    BIGINT UNSIGNED NULL COMMENT '关联商品（生成草稿时可能尚未发布）',
  type          ENUM('DRAFT', 'ANSWER') NOT NULL DEFAULT 'DRAFT',
  input_ref     VARCHAR(500) NOT NULL DEFAULT '' COMMENT '输入摘要/图片引用',
  output_text   MEDIUMTEXT NULL COMMENT 'AI 原始输出',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='AI 调用记录（草稿/应答）';

-- ---------------------------------------------------------------------
-- 6. 访问统计表（T2 部署验收：含访问统计其一）
--    按 path 累加访问次数
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS page_views;
CREATE TABLE page_views (
  path       VARCHAR(200) NOT NULL COMMENT '页面路径',
  views      BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '访问次数',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (path)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='页面访问统计';

-- =====================================================================
-- 初始化数据
-- =====================================================================

-- 演示账号：一个卖家、一个买家（骨架期免登录直接用）
INSERT INTO users (id, username, nickname, role) VALUES
  (1, 'seller_demo', '演示卖家', 'SELLER'),
  (2, 'buyer_demo',  '演示买家', 'BUYER')
ON DUPLICATE KEY UPDATE nickname = VALUES(nickname);

-- 初始分类
INSERT INTO categories (id, name, sort_order) VALUES
  (1, '数码电子', 1),
  (2, '图书教材', 2),
  (3, '生活用品', 3),
  (4, '运动户外', 4),
  (5, '服饰鞋包', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order);

SET FOREIGN_KEY_CHECKS = 1;
