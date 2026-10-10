# 二手集市 + AI 卖家助手

[![CI](https://github.com/lizhi208/vibe-lizhi/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lizhi208/vibe-lizhi/actions/workflows/ci.yml)

面向普通个人闲置卖家的 Web 产品原型：**拍照上传物品照片，AI 自动生成商品标题、详情文案与二手参考报价**，卖家二次编辑确认后发布；买家可浏览、搜索、分类查看商品并下单锁定。

> 需求与边界详见 [docs/PRD.md](docs/PRD.md)。
> 本期是**工程骨架**：前后端目录、数据库脚本与分层代码空壳，业务点以 `TODO` 标注。

## 技术栈

| 端 | 技术 |
| --- | --- |
| 前端 | 原生 HTML / CSS / JavaScript（无构建工具） |
| 后端 | Node.js + Express，分层 routes / controllers / services |
| 数据库 | MySQL 8.x（utf8mb4） |
| AI | 仅调用第三方大模型 API（不训练模型） |

## 目录结构

```
vibe-lizhi/
├── backend/                  # Express 后端
│   ├── package.json
│   ├── .env.example          # 环境变量模板（复制为 .env）
│   └── src/
│       ├── server.js         # 启动入口
│       ├── app.js            # 应用装配（中间件/路由/错误处理）
│       ├── config/db.js      # MySQL 连接池
│       ├── routes/           # 路由：product / order / ai
│       ├── controllers/      # 控制器：取参、调 service、返回
│       ├── services/         # 业务与 SQL：product / order / ai
│       ├── middlewares/      # 404、统一错误处理
│       └── utils/ApiResponse.js
├── frontend/                 # 原生前端（可用任意静态服务器打开）
│   ├── index.html            # 首页：列表 / 搜索 / 分类
│   ├── publish.html          # 发布页：上传照片 → AI 草稿 → 确认发布
│   ├── detail.html           # 详情页：商品信息 + 下单锁定
│   ├── css/style.css
│   └── js/                   # config / api 封装 / 三个页面对应脚本
├── database/
│   └── schema.sql            # 建库、建表、初始分类与演示账号
├── docs/
│   └── PRD.md
├── index.html                # T3 一页想法电梯稿（课堂展示用）
├── README.md
└── AGENTS.md                 # AI 协作者必须遵守的项目约定
```

## 快速开始

### 1. 初始化数据库

```bash
mysql -u root -p < database/schema.sql
```

脚本会创建数据库 `flea_market_ai`、5 张表（users / categories / products / orders / ai_generation_logs），并写入初始分类和演示账号。

### 2. 启动后端

```bash
cd backend
npm install
copy .env.example .env        # Windows；macOS/Linux 用 cp
# 编辑 .env：填写 DB_PASSWORD 与 AI_API_KEY
npm run dev
```

后端默认运行在 http://localhost:8080 ，健康检查：http://localhost:8080/api/health

### 3. 启动前端

用任意静态服务器托管 `frontend/` 目录即可，例如 VS Code 的 Live Server（默认 5500 端口，与后端 CORS 配置一致），或：

```bash
cd frontend
python -m http.server 5500
```

浏览器打开 http://localhost:5500/index.html 。

## 接口概览（骨架）

| 方法 | 路径 | 说明 | 状态 |
| --- | --- | --- | --- |
| GET | `/api/health` | 健康检查 | 已可用 |
| GET | `/api/categories` | 分类列表 | 已可用 |
| GET | `/api/products?keyword=&categoryId=` | 商品列表/搜索/分类 | 已可用 |
| GET | `/api/products/:id` | 商品详情 | 已可用 |
| POST | `/api/products` | 卖家确认后发布商品 | 已可用 |
| PUT | `/api/products/:id` | 编辑商品 | 已可用 |
| POST | `/api/orders` | 下单锁定（ON_SALE → LOCKED） | 已可用（事务 + 防重复锁定） |
| PATCH | `/api/orders/:id/deal` | 标记成交（LOCKED → SOLD） | 已可用 |
| POST | `/api/ai/draft` | 上传照片生成文案+参考价草稿 | 待接第三方 API（无 Key 时可手动发布） |
| POST | `/api/ai/answer` | AI 应答买家咨询（P1，可裁剪） | TODO |
| GET | `/api/stats/overview` | 商品总览（分类分布+状态分布） | 已可用（T1 接入） |
| POST | `/api/stats/visit` | 记录一次页面访问 | 已可用（T2 访问统计） |
| GET | `/api/stats/visits` | 读取各页面访问量 | 已可用 |

> 说明：当前 MySQL 3306 实例实测为 5.7；`schema.sql` 中 ngram 全文索引使用 `/*!80000*/` 版本条件注释，5.7 自动忽略，搜索走 LIKE。

## 项目边界（重要）

- **不做**在线支付、不做物流；成交仅修改商品状态。
- **AI 输出一律是草稿建议**：必须经卖家二次编辑确认后才能发布，不允许自动提交。
- AI 服务不可用时，卖家可以手动填写并完成发布，闭环不中断。
- 进阶功能（以图搜同类、AI 砍价 agent）不纳入第一版。

## 外部能力接入记录（T1：ECharts 统计看板）

**接的是什么**：[Apache ECharts 5.5.0](https://echarts.apache.org/)（开源图表库），用于首页旁的「商品统计看板」页 [stats.html](frontend/stats.html)，展示分类分布饼图、状态分布柱状图、页面访问量。

**怎么接的（三步）**：

1. **引入库**：纯 CDN 方式，在 `stats.html` 的 `<head>` 加一行
   `<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js"></script>`
   不经过 npm/构建工具（与项目「原生前端、无构建」的约定一致）。
2. **准备数据**：后端新增 `/api/stats/overview`（分类分布 + 状态分布）和 `/api/stats/visits`（访问量），SQL 放在 [stats.service.js](backend/src/services/stats.service.js)，用 `GROUP BY` 聚合后直接返回 ECharts 需要的 `{name, value}` 结构。
3. **渲染图表**：[stats.js](frontend/js/stats.js) 用 `echarts.init(dom)` + `setOption({...})` 分别渲染饼图、柱状图；`resize` 事件里调用 `chart.resize()` 做自适应。

**坑在哪（实录）**：

- **CDN 加载失败要有兜底**：校园网/离线时 `echarts` 可能是 `undefined`，直接 `echarts.init` 会抛错。已在 `initChart` 里判断 `typeof echarts === 'undefined'` 并显示友好提示，避免整个页面白屏。
- **数据契约要对齐**：ECharts 饼图需要 `[{name, value}]`，柱状图需要分开的 `xAxis.data` 数组和 `series.data` 数组。一开始把 SQL 原样返回，前端还要再 `map`；后来让后端直接返回贴合的格式，前端只负责渲染。
- **数字类型**：MySQL 的 `COUNT(*)` 经 mysql2 返回有时是字符串，`value` 必须 `Number(...)` 转一下，否则饼图百分比/柱状图 label 显示异常。
- **容器必须有高度**：`.chart-box` 不给 `height` 时画布高度为 0，图表「渲染了但看不见」。已在 CSS 固定高度（320px/260px）。

**访问统计（T2 验收项）**：首页加载时上报 `POST /api/stats/visit {path}`，后端写入 `page_views` 表（按 path 累加），看板页读取展示。失败静默，不影响主流程。

## 质量护栏（第 5 天：契约测试 + CI 闸门）

功能完成的定义是**测试绿了**，不是"我看着像好了"。

- **接口契约**：所有端点的正常/边界/错误码约定见 [docs/接口契约.md](docs/接口契约.md)，是前后端和测试的唯一事实源。
- **契约测试**：[backend/test/api.contract.test.js](backend/test/api.contract.test.js)，用 Node 内置 `node:test` + `supertest`，**连真实 MySQL、不 mock 被测逻辑**，覆盖每个端点的正常路径、边界值、错误码（52 个用例）。
- **隔离测试库**：测试一律用独立库 `flea_market_test`，由 [init-test-db.js](backend/test/helpers/init-test-db.js) 每组用例前重建，绝不碰开发库。
- **CI 闸门**：[.github/workflows/ci.yml](.github/workflows/ci.yml)，push/PR 自动在 **MySQL 5.7 与 8.0** 双版本上跑测试，不绿不算完成。
- **AI 互审记录**：评审清单、每条意见的裁决（修复/放过理由/上会）见 [docs/评审记录-day5.md](docs/评审记录-day5.md)。

本地跑测试：

```bash
cd backend
npm install
npm test          # 需要本地 MySQL；自动重建 flea_market_test 库
```
