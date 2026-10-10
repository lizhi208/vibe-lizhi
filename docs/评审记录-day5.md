# AI 互审记录 · 第 5 天

> 评审方式：以「第二个 AI」视角，只给代码 + [接口契约.md](接口契约.md)，不带聊天历史，不带护短立场。
> 审查维度：① 不存在的 API/依赖；② 安全（密钥/注入/越权）；③ 与契约不符；④ 可删的过度生成；⑤ 声称"应该没问题"但无验证证据之处。
> 裁决三线：**真问题 → 修复 + 红测试锁定；误报 → 写理由放过；拿不准 → 记「上会」**。

## 一、评审结论（红屏证据）

按契约补了 52 条契约测试（连真实 MySQL，不 mock 被测逻辑）。**修复前：39 过 / 13 红**，13 条红全部对应下面的真问题，没有一条是测试写错。

```
ok 1 健康检查与分类 / ok 2 分页 / ok 3 商品详情 / not ok 4 发布商品
not ok 5 编辑商品 / not ok 6 下单锁定 / not ok 7 标记成交
not ok 8 AI 接口 / ok 9 统计 / ok 10 404
# tests 52   # pass 39   # fail 13
```

## 二、真问题清单（已修复，红测试锁定）

### P0-1　错误处理把 4xx 说成 500：HTTP 状态码与响应体 code 不一致
- 位置：[errorHandler.js:7-8](../backend/src/middlewares/errorHandler.js)
- 现象：HTTP 状态取 `err.status`（正确），响应体 code 取 `err.code || 500`。但业务代码（order.service.js）只设了 `err.status` 没设 `err.code`，导致**重复下单 HTTP=409、body.code 却=500**；订单不存在/重复成交 404/409 同样 body.code=500。客户端若按 body.code 判错会全部误判成服务器错误。
- 怎么验证：对同一商品连下两单，第二单断言 `status===409 && body.code===409`（修复前 409≠500，红）。
- 修复：数字状态码归一，HTTP 状态码与 body.code 强制一致。

### P0-2　下单参数无类型校验：NaN 走到 SQL，错误码误导
- 位置：[order.controller.js:7-13](../backend/src/controllers/order.controller.js)
- 现象：`productId:'abc'` → `Number('abc')=NaN` → 条件更新 0 行 → 返回 **409「已被锁定」**（实为 400 参数错）；`-5` 等负数也不拦。
- 怎么验证：`POST /api/orders {productId:'abc'}` 断言 400（修复前实际 409，红）。
- 修复：productId 必填且必须正整数，否则 400。

### P0-3　下单 buyerId 非法/幽灵买家裸奔成 500
- 位置：[order.controller.js:12](../backend/src/controllers/order.controller.js)
- 现象：`buyerId:'abc'` → NaN 插入报 500；`buyerId:99999` → 触发外键约束 `ER_NO_REFERENCED_ROW_2`，错误中间件不认识，直接 500。错误码语义错位（应 400）。
- 怎么验证：两种 body 各发一次，断言 400 且 body.code=400（修复前均 500，红）。
- 修复：buyerId 给了就必须正整数；错误中间件把 MySQL 外键错误统一映射成 400。

### P0-4　编辑商品零校验：负价格落库、空标题、外键 500
- 位置：[product.controller.js:86-95](../backend/src/controllers/product.controller.js)、[product.service.js:106-121](../backend/src/services/product.service.js)
- 现象：`PUT /:id {price:-50}` 返回 200 且**负价格真的写进库**；`{title:''}` 200；`{categoryId:888}` 外键报错 500。发布接口 `categoryId:'abc'` 同样会带病入库。
- 怎么验证：负价格 PUT 后再 GET，断言价格未被污染（修复前 GET 回 -50，红）；非法分类断言 400（修复前 500，红）。
- 修复：编辑走和发布同一套校验（标题非空白、价格有限且≥0、分类正整数、参考价合法）；不存在分类由外键映射成 400。

### P1-5　图片上传无大小/类型限制（内存型 DoS 面）
- 位置：[ai.routes.js:9](../backend/src/routes/ai.routes.js)
- 现象：`multer({storage:memoryStorage()})` 无 `limits`、无 `fileFilter`，任意类型、任意大小文件都全量进内存；超限/错误类型还会从 multer 裸抛成 500。
- 怎么验证：上传 6MB 文件断言 400、上传 `.txt` 断言 400（修复前分别是 500 / 走到 service 抛 500，红）。
- 修复：`limits.fileSize=5MB` + 只收 `image/*`；multer 错误统一转 400。

## 三、误报项（评审也讲证据，评估不服从）

| 评审怀疑 | 放过理由（验证方式） |
| --- | --- |
| SQL 注入（products/orders/stats 拼接 SQL） | 全部值走 `?` 占位符；updateProduct 的字段名来自代码内白名单（service.js:109），用户输入永远只在占位符里。已用 `keyword=%`、`categoryId` 等用例验证。 |
| 密钥泄露（.env / AI_API_KEY） | `git ls-files` 只有 `.env.example`，`.env` 在 `backend/.gitignore`；代码仅引用环境变量，无硬编码密钥。 |
| 依赖不存在/对不上 | package.json 六个依赖与代码 require 逐一核对一致；测试新增的 supertest 仅在 devDependencies。 |
| express.json body 无限制 | Express 默认 100kb，骨架期足够，非缺陷。 |
| markDeal 收到 id='abc' 返回 404 | 该 id 确定查不到订单，404「订单不存在」语义正确，非缺陷，契约已写明。 |
| rollback 被调用两次（先回滚后 throw，catch 再 rollback） | order.service.js:23→37，已回滚连接上二次 rollback 是 no-op，mysql2 不抛错；无害，仅风格问题，不为它改事务结构、避免引入新风险。 |

## 四、拿不准 → 上会（课堂讨论，不擅自改）

1. **列表是否该展示 LOCKED 商品**：`listProducts/listProductsPaged` 现在同时返回 ON_SALE 和 LOCKED（service 注释明确）。买家在列表看到已被锁定的商品，点进去下单必 409。两种产品取向——保留可营造"手慢无"，隐藏则更少无效点击。**涉及已验收的前端分页契约（day3 起锁定商品计入 total），不在护栏日擅自改，提请讨论。**
2. **CORS 默认 `*`**：app.js:15。骨架期 PRD 明确免登录、无 cookie/凭证，通配无实际越权面；一旦日后加登录态，必须收紧为白名单来源。记为技术债，不在本次改。
3. **统计访问量可被刷**：/api/stats/visit 无鉴权无频控。演示用访问统计本就公开，接受；若用于真实运营指标需加签名/频控。

## 五、过度生成检查

- 未发现可删的死代码：AI service 的 TODO 占位是 PRD 约定的接入点；answer 接口 501 是明确契约，保留。
- 静态托管前端（app.js:23）是 day4 同域部署所需，非过度生成。

## 六、修复后结果

修复后同一套测试：**52 过 / 0 红**（见当日提交与 CI 运行记录）。功能完成的定义从"我看着像好了"变为"测试绿了"。
