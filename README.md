# 二手集市 + AI 卖家助手

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

后端默认运行在 http://localhost:3000 ，健康检查：http://localhost:3000/api/health

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

> 说明：当前 MySQL 3306 实例实测为 5.7；`schema.sql` 中 ngram 全文索引使用 `/*!80000*/` 版本条件注释，5.7 自动忽略，搜索走 LIKE。

## 项目边界（重要）

- **不做**在线支付、不做物流；成交仅修改商品状态。
- **AI 输出一律是草稿建议**：必须经卖家二次编辑确认后才能发布，不允许自动提交。
- AI 服务不可用时，卖家可以手动填写并完成发布，闭环不中断。
- 进阶功能（以图搜同类、AI 砍价 agent）不纳入第一版。
