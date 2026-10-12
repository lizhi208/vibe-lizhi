今天做了什么：
今天给项目接上了真实的 LLM 能力——day6 的功能冻结被课程解除（day7 明确要求加 AI 功能）。一天五件事加课后真实 Key 验证：契约先行改 AI 段、LLM 封装接通真实多模态调用、失败兜底三件套（无 Key 降级/超时/断网不白屏）、成本账本+演示脚本+冲刺板、C1 用法统计，最后用真实 Key 验证端到端识图生成草稿。

**契约先行（docs/接口契约.md）**：把 §10 `/api/ai/draft` 从"待接入"写死成真实行为——200 出参 `{title, description, referencePrice}`（referencePrice 允许 null）；502 统一兜底四类场景（未配置 Key 不发请求直接降级/超时 5s/网络不可达/上游错误或输出无法解析），body.code 强制 502；前端约束写进契约：任何失败保留手动填写路径，断网优雅提示不白屏。§0 通用错误码表补 502 行。C1 又加 §16 `GET /api/ai/stats`（四数字字段 + 口径 `total = success + failed`）。

**LLM 封装（Key 只待后端）**：新建 backend/src/services/llm.client.js——OpenAI 兼容协议最小封装，默认百炼 compatible-mode，换火山/硅基流动只改 .env 三行零改码；占位符 Key（`your_api_key`）视为未配置，**不发起任何外部请求直接 502 降级**；axios 超时，ECONNABORTED→"超时"、无 response→"不可达"、有 response→"上游状态 N"三档文案。提示词放 backend/src/services/ai.prompts.js 常量文件入库——提示词也是代码，要评审要版本管理。backend/src/services/ai.service.js 重写 generateDraft：图片内存转 data URL 转发（不落盘），parseDraft 容忍 ```json 围栏、缺字段/非 JSON 一律 502 降级。

**真实 Key 验证（课后核心收获）**：拿到百炼 Key 后先填进 .env（确认 gitignore 生效，git status 不追踪），启动后端 curl 测试——`qwen-vl-max` 返回 404 "Model not exist"（旧名已下架），`qwen-vl-plus` 同样不存在，`qwen-vl-max-latest` 返回 Access denied（存在但无权限）。用 `GET /v1/models` 列出 175 个可用模型，发现 **`qwen3-vl-plus`** 在列表里。直接测：1x1 像素被拒（"图片长宽必须大于 10"），说明模型确实在处理图片——100x100 像素成功返回结构化 JSON。commit 32caa59（初版 qwen-vl-max）→ 8c2c6f1（适配 qwen-turbo 文本降级路径）→ ad19aaf（确认 qwen3-vl-plus 视觉模型，端到端验证通过）。

**模型自动路由（适配免费额度）**：在 ai.prompts.js 加 `isVisionModel(modelName)`——模型名含 vl/omni/vision 时发图片 data URL，否则用文件名做文本线索。这样 `qwen3-vl-plus`（视觉）和 `qwen-turbo`（纯文本）都能跑，用户换模型只改 .env 一行零改码。真实调用超时从 5s 放宽到 15s（契约 5s 面向降级路径，真实调用留余量）。验证：`POST /api/ai/draft` 上传 iphone12_back.jpg → `{"title":"iPhone 12 背面","description":"成色全新，无划痕...","referencePrice":150}` ✅。C1 统计端点 `GET /api/ai/stats` 返回 3 次调用 / 2 成功 / 成本 ¥0.0062 ✅。

**前端兜底（publish 页）**：catch 分支区分断网（`!navigator.onLine || err instanceof TypeError`）→「AI 服务暂不可达，请检查网络；也可以直接手动填写后发布」；其他失败显示后端降级文案。表单始终可用——AI 失败不阻断发布闭环（PRD 硬约束）。本地开发时前端跑 5500 端口、后端跑 8080，config.js 默认值从 `/api`（同域托管用）改成 `http://localhost:8080/api`（ngrok 上线时改回 `/api` 即可）。详情页空 `image_url` 原来渲染 `<img src="">` 裂图，改成占位「暂无图片」div。

**测试（96/96 全绿，新增 14 条）**：契约组加 2 条——合法图片+无 Key→502 且 body.code=502；C1 stats 口径用例（增量断言与顺序无关）。关键设计：describe 级 before/after 把 `AI_API_KEY` 钉死成占位符，**契约测试永不真实调外部大模型**（不发请求、不花钱、不受网络抖动影响）。新建 unit.llm-client.test.js 12 条：isConfigured 占位符识别、无 Key 不发请求（假 post 计数=0）、超时/断网/上游 500/choices 缺失四路 502、正常路径校验 Bearer 头与超时、parseDraft 五路（纯 JSON/围栏/非法价格归 null/非 JSON/缺字段）。用注入假 HTTP POST 覆盖网络分支，不 mock 被测逻辑本身。

**文档三件套 + C1**：docs/AI成本估算.md（百炼 qwen-vl-max 标价，单次 ≈0.0031 元，月预算上限 20 元）；docs/演示脚本.md 收工三行 + 90 秒演示动线（含断网演练当评委面做）；docs/冲刺任务板.md 已完成证据表 + 剩余 P0/P1/P2 + 五条风险对策 + 教师签字位；docs/数据字典.md（T2 等效产物，MCP 配置 JSON 留给人工配）。C1 用法统计：backend/src/services/aiLog.service.js 复用 ai_generation_logs 表（成功 output_text=草稿 JSON，失败=NULL 记原因，写日志失败绝不阻断主流程），`GET /api/ai/stats` 返回调用量+估算成本，发布页底部一行展示。

卡过什么坑：
一是 `Number(null) === 0` 差点阴我——parseDraft 把契约明确允许的 `referencePrice: null`（AI 估不出价）误判成 0 元参考价。单测 `容忍 ```json 围栏` 用例当场抓出（`0 !== null`），改成先判空再转数字。教训：JS 的隐式转换坑里，契约里写明白的 null 语义必须用测试钉死。

二是 C1 统计用例第一版想断言"初始为 0"，但同组前面的 502 用例已经记过一条失败日志——改成增量断言（s1 - s0 = +1），与用例执行顺序解耦，更贴近"口径"本身。

三是纠结过日志写库失败要不要让接口也挂——最后定"绝不阻断主流程，只 console.error"：统计是附属能力，不能反过来拖垮主链路，这跟 AI 降级保发布闭环是同一个哲学。

四是真实 Key 验证时模型名踩坑——`qwen-vl-max` 是旧名已下架（返回 "Model not exist" 而非 "Access denied"，说明不是权限问题而是模型被移除）。第一反应是翻百炼控制台找开通入口，但控制台里根本没有这个模型名了。最终用 `GET /v1/models` 列出 175 个可用模型才发现 `qwen3-vl-plus` 才是当前免费额度里的视觉模型。教训：模型名会迭代，**别靠记忆猜，API 的 model list 才是事实源**——这一条也写进了 .env.example 注释。

五是 1x1 测试图片被模型拒绝（"长宽必须大于 10px"），差点以为是 Key 不支持视觉——这说明模型确实在解析图片，只是尺寸不够。换成 100x100 立刻通过。教训：测试用例的边界值要从模型约束的视角设计，不能用"最小合法 base64"的程序员视角偷懒。

明天打算：
黑客松冲刺。人工清单先做完：当堂拔网线做断网演练、Trae 配 MySQL MCP（只读账号）让 AI 重生成一遍数据字典核对、ngrok 起隧道复核演示动线（config.js 改回 /api）。然后按演示脚本 90 秒动线彩排两遍，准备面审讲"哪些是我们用 AI 做的"。成本估算表里模型标价要按 qwen3-vl-plus 的实际价格更新（当前写的是 qwen-vl-max 的，已下架）。
