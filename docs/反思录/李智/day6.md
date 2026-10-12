今天做了什么：
今天进入翻车急救与交叉验收。功能冻结令生效——只修不添，新想法全进 backlog。一天四件事：急救演练、C1 行为不变重构、功能冻结 backlog、交叉验收准备。

**急救演练（docs/急救演练-day6.md）**：在 throwaway 分支 `demo/break-rescue` 上故意把 day5 刚修好的 errorHandler 状态码归一逻辑改回修复前的 bug 形态（HTTP 取 err.status、响应体 code 取 err.code 两者分裂），模拟"顺手改坏了还不自知"。跑 `node --test "test/unit.error-matrix.test.js"` 必现 4 红（26 过 / 4 红），红屏原文一字不转述地贴给 AI：`状态码归一` 断言 `500 !== 409`、`字符串 code` 断言 `'ER_LOCK_DEADLOCK' !== 500`、`整数 code 兜底` `500 !== 423`、`业务 404 透传` `500 !== 404`。按六步走：①`git checkout .` 回滚止血 → ②喂回 stack trace 原文 → ③最小复现命令（单测 0.3 秒必现，比 curl 稳）→ ④`git diff` 二分定位到 errorHandler 状态码段 → ⑤换刀新会话只带 errorHandler + 契约一次性恢复 → ⑥止损红线（1 轮修好未触发"3 轮删重写"）。止血后 30/30 单测绿、全 82 测试绿。切回 master 删 demo 分支，只留演练文档入库，master 历史不被污染。

**C1 行为不变重构（测试绿作护栏）**：先让 AI 识别项目最大坏味道——product.controller.js 的 createProduct 和 updateProduct 里 6 处重复的价格/分类/参考价校验（DRY 违反）。新建 [backend/src/utils/validators.js](../../backend/src/utils/validators.js)，提取三个纯函数 `validatePrice` / `validateCategoryId` / `validateReferencePrice`，失败抛带 `status=400` 的 Error 交 errorHandler 统一返回（风格与 parsePaging.js 一致）。controller 改为调用，**净减 35 行**（8 增 43 删）。关键约束：title 校验未提取——createProduct（宽松：接受任意 truthy）与 updateProduct（严格：要求 string 类型）语义不同，强行合并反而改行为。跑全量 `npm test`：**82 过 / 0 红**，API 响应字节级不变（throw 400 经 errorHandler 后 status=400、body.code=400、message 一致），测试绿作为护栏验证行为不变。功能冻结下只重构不加功能。

**功能冻结 backlog（docs/backlog.md）**：列了 8 项第一版砍掉的功能（登录态、CORS 白名单收紧、访问量防刷、商品收藏、订单状态机扩展、AI 多轮对话、以图搜同类、在线支付/物流），每条写砍掉理由 + Demo Day 讲法（"为了让你 30 秒上手砍了登录"、"多轮砍掉是因为上下文管理会吃掉一半工期"）。冲刺优先级只剩"必须修交叉验收重档缺陷"。

**交叉验收准备**：README 补了「交叉验收清单」小节——启动复核命令、14 个端点逐项点表（含 page=abc→400、price=-50→400 且原价不变、productId 不存在→409 等契约关键点）、三档缺陷 issue 模板（契约不符/崩溃/数据错误 + 复现步骤字段）。接口概览表补了漏掉的 `GET /api/products/page` 行。T1 交叉验收本身（拉同学仓库互测提 issue）需人工做——我没有同学仓库地址，只能把自己的仓库准备成可被验收状态。

卡过什么坑：
一是急救演练跑全量测试时契约测试组突然报 `Access denied for user 'root'@'localhost' (using password: YES)`，第一反应以为是 errorHandler 改坏波及到库——但单测组（不连库）4 红才是真破坏，契约组 access denied 是环境瞬态（多个 describe 的 before 并发建管理连接时 MySQL 短暂拒绝）。直接 `node` 调 resetTestDatabase 单跑正常，重跑全量也绿了。教训：红屏先分清"我改坏的"和"环境抖动"，别把环境问题当成代码 bug 一起改。
二是重构时差点把 title 校验也合并——createProduct 的 `!title || !String(title).trim()`（接受非字符串 truthy）和 updateProduct 的 `typeof body.title !== 'string' || !body.title.trim()`（要求严格 string）语义不同，合并会改行为。克制住只提取真正重复的三处数值校验。
三是 referencePrice 的空值处理要兜住 undefined 和 null 两种：createProduct 未传是 undefined（`!= null` 兜住），updateProduct 显式清空是 null。validator 用 `raw == null`（== 同时覆盖 undefined + null）+ `raw === ''` 三路归 null，两处调用都行为不变。

明天打算：
功能已冻结，后续只接交叉验收的整改清单——必须修全清，建议修按 Demo Day 演示路径取舍。去 Gitee 发第 6 天完工报告 issue，跑 `python 交作业自查.py --day 6` 终验。提醒自己人工做：T1 拉顺时针下一位同学仓库互测提 issue、Gitee 流水线 tab 首次开通 Gitee Go、GitHub Settings 里给 main 加分支保护（Require status checks 选两个 MySQL check）。
