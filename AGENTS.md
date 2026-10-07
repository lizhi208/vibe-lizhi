# AGENTS.md —— AI 协作者约定

在本仓库中编写或修改代码的任何 AI 助手，请先读完本文件与 `docs/PRD.md`，并严格遵守以下约定。

## 1. 项目事实（唯一真源）

- 产品：二手集市 + AI 卖家助手；需求文档以 `docs/PRD.md` 为准。
- 技术栈：Node.js + Express（`backend/`）+ 原生 HTML/CSS/JS（`frontend/`）+ MySQL 8（`database/schema.sql`）。
- 前端目录名是 **`frontend`**，后端目录名是 **`backend`**，不要自创拼写或新增平行目录。

## 2. 本期范围红线

- 最小闭环：商品发布（图+文）→ 列表/搜索/分类 → 详情 → 下单锁定 → 标记成交。
- **禁止实现**：在线支付、物流配送、资金流。成交只能通过修改商品/订单状态完成。
- **禁止实现**第一版范围外功能：以图搜同类、AI 砍价 agent。
- `POST /api/ai/answer`（AI 应答咨询）是 P1 可裁剪功能，未经确认不要投入实现。

## 3. AI 功能铁律

- AI 只调用第三方大模型 API（密钥从 `.env` 读取），**不训练、不内置模型**。
- AI 的文案、报价、答复**只能作为草稿/建议**：
  - 后端不得让 AI 结果直接写入 `products` 表；
  - 前端必须把结果回填到可编辑表单，由卖家点击「确认发布」后才调 `POST /api/products`。
- 界面/字段需体现「AI 生成，仅供参考」语义（参考价字段为 `reference_price`，与最终售价 `price` 分离）。
- AI 接口超时或报错时，发布闭环必须仍可手动完成。

## 4. 编码约定

### 后端（backend/）

- 分层职责：`routes` 只定义路径与参数位置；`controllers` 只做取参→调 service→响应；`services` 写业务与 SQL。不要跨层（例如不要在路由里写 SQL）。
- 统一响应用 `utils/ApiResponse.js`：成功 `{ code: 0, message, data }`。
- 异常交给 `next(err)`，由 `middlewares/errorHandler.js` 统一处理，不要在控制器里吞异常。
- 数据库访问统一走 `config/db.js` 的 mysql2 连接池；多步写操作使用事务。
- 商品状态机固定为 `ON_SALE → LOCKED → SOLD`，使用字符串枚举，与数据库 ENUM、前端 `STATUS_TEXT` 保持字面量一致。
- 下单锁定必须用条件更新保证原子性：`UPDATE products SET status='LOCKED' WHERE id=? AND status='ON_SALE'`，`affectedRows===0` 即拒绝下单。

### 前端（frontend/）

- 不引入框架和构建工具；页面是 `index.html` / `publish.html` / `detail.html` 三个静态页。
- 所有接口调用走 `js/api.js`，基址在 `js/config.js` 配置，不要在页面里硬编码地址。
- 脚本用 IIFE 隔离作用域，按页面一个文件（index/publish/detail）。

### 数据库

- 表结构变更一律先改 `database/schema.sql`（骨架期可直接重建；正式期再补迁移脚本）。
- 表名用复数（users/products/orders…），主键 `id BIGINT UNSIGNED AUTO_INCREMENT`，时间戳用 `created_at/updated_at DATETIME`。
- 字符集统一 `utf8mb4`；金额用 `DECIMAL(10,2)`，禁止用浮点存金额。

## 5. 环境与密钥

- `.env` 不入库（已在 `.gitignore`）；需要新配置时同步更新 `.env.example`。
- 不要把真实 API Key、数据库密码写进代码或提交到仓库。

## 6. 交付要求

- 只做被要求的改动，不顺手加功能、不创建无关文档。
- 完成后自行做最小验证：后端 `node -c` 语法检查 / 启动 `/api/health`；前端用浏览器跑通受影响页面。
- Windows 环境：命令示例优先给出 PowerShell 兼容写法。
