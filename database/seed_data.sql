-- 二手集市 数据库初始数据导出（结构见 database/schema.sql）
-- 生成时间: 2026-10-09T00:22:14.593Z

USE flea_market_ai;
SET FOREIGN_KEY_CHECKS=0;

-- users: 2 行（schema 已插，这里防重复）
INSERT INTO users (id, username, password_hash, nickname, role, created_at) VALUES (1, 'seller_demo', '', '演示卖家', 'SELLER', '2026-10-07 03:16:58') ON DUPLICATE KEY UPDATE nickname=VALUES(nickname);
INSERT INTO users (id, username, password_hash, nickname, role, created_at) VALUES (2, 'buyer_demo', '', '演示买家', 'BUYER', '2026-10-07 03:16:58') ON DUPLICATE KEY UPDATE nickname=VALUES(nickname);

-- categories: 5 行（schema 已插，这里防重复）
INSERT INTO categories (id, name, sort_order) VALUES (1, '数码电子', 1) ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO categories (id, name, sort_order) VALUES (2, '图书教材', 2) ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO categories (id, name, sort_order) VALUES (3, '生活用品', 3) ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO categories (id, name, sort_order) VALUES (4, '运动户外', 4) ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO categories (id, name, sort_order) VALUES (5, '服饰鞋包', 5) ON DUPLICATE KEY UPDATE name=VALUES(name);

-- products: 24 行
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (1, 1, 1, '演示-iPad Air 4', '9成新，带笔，测试数据', '', '2399.00', '2500.00', 'SOLD', '2026-10-07 03:20:43', '2026-10-07 03:20:43');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (2, 1, 1, '演示-Kindle Paperwhite 电子书阅读器', '95新，无磕碰，含原装数据线。演示数据。', '', '399.00', '450.00', 'LOCKED', '2026-10-07 03:21:00', '2026-10-07 03:21:43');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (3, 1, 3, '演示-露营折叠椅', '轻便，9成新，演示数据', '', '88.00', NULL, 'ON_SALE', '2026-10-07 03:24:05', '2026-10-07 03:24:05');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (37, 1, 1, '罗技 MX Master 3S 无线鼠标', '几乎全新，配件齐全，办公神器', '', '389.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (38, 1, 2, 'Kindle Paperwhite 5 电子书', '11代，8G，无划痕，含原装皮套', '', '520.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (39, 1, 1, '小米手环 8 NFC 版', '用了三个月，功能正常', '', '139.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (40, 1, 1, '索尼 WH-1000XM4 降噪耳机', '降噪优秀，耳罩无磨损，送收纳盒', '', '980.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (41, 1, 1, 'Switch OLED 白色主机', '单机+底座，无拆修，屏幕贴膜', '', '1650.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (42, 1, 1, '机械键盘 杜伽 K320 红轴', '樱桃红轴，手感清爽，键帽完好', '', '260.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (43, 1, 1, 'iPad 第9代 64G WiFi', '学习看网课神器，电池健康93%', '', '1450.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (44, 1, 1, '佳能 G7X Mark III 卡片机', 'vlog 利器，两块电池，箱说全', '', '3200.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (45, 1, 3, '小米空气净化器 4 Lite', '搬家出，滤芯还剩七成', '', '320.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (46, 1, 3, '宜家 KALLAX 卡莱克 置物架', '白色 4x4，自提，已拆好搬运', '', '180.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (47, 1, 3, '无印良品 棉麻懒人沙发', '米色，无污渍，外套可拆洗', '', '220.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (48, 1, 3, '美的 1.5L 电热水壶', '304 不锈钢，用了半年', '', '49.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (49, 1, 4, '迪卡侬 折叠露营桌', '铝合金轻便，含收纳袋', '', '89.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (50, 1, 4, '牧高笛 双人自动帐篷', '防风防雨，露营两次', '', '259.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (51, 1, 4, '捷安特 ATX 660 山地车', '21速，变速刹车正常，适合通勤', '', '680.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (52, 1, 4, '羽毛球拍 尤尼克斯 NF8S', '拉线25磅，拍框无碰撞', '', '199.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (53, 1, 2, '三体全集 刘慈欣（3册）', '正版，九五新，无笔记', '', '45.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (54, 1, 2, '人类简史+未来简史 套装', '书脊完好，内页干净', '', '35.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (55, 1, 2, '考研英语真题 黄皮书 2010-2024', '部分有铅笔标注，可擦', '', '25.00', NULL, 'ON_SALE', '2026-10-08 00:57:35', '2026-10-08 00:57:35');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (56, 1, 1, '飞利浦 HX6730 电动牙刷', '含两个新刷头，充满电可用2周', '', '109.00', NULL, 'ON_SALE', '2026-10-08 00:57:36', '2026-10-08 00:57:36');
INSERT IGNORE INTO products (id, seller_id, category_id, title, description, image_url, price, reference_price, status, created_at, updated_at) VALUES (57, 1, 3, '小熊 多功能养生壶 1.8L', '煮茶煲汤都可，玻璃无磕碰', '', '79.00', NULL, 'ON_SALE', '2026-10-08 00:57:36', '2026-10-08 00:57:36');

-- orders: 2 行
INSERT IGNORE INTO orders (id, product_id, buyer_id, status, created_at, updated_at) VALUES (1, 1, 2, 'DEAL', '2026-10-07 03:20:43', '2026-10-07 03:20:43');
INSERT IGNORE INTO orders (id, product_id, buyer_id, status, created_at, updated_at) VALUES (2, 2, 1, 'LOCKED', '2026-10-07 03:21:43', '2026-10-07 03:21:43');

-- page_views: 1 行
INSERT IGNORE INTO page_views (path, views, updated_at) VALUES ('/index.html', 2, '2026-10-09 00:20:49');

SET FOREIGN_KEY_CHECKS=1;

