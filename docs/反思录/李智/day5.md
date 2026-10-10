今天做了什么：
今天功能一行没加，只上质量护栏，一共三道：AI 互审、AI 出题考 AI、CI 闸门。核心转变是把「功能完成」的定义从"我看着像好了"改成"测试绿了"。

护栏① AI 互审（docs/评审记录-day5.md）：按课堂要求开"第二个 AI"视角，只给代码和契约、不带聊天历史，按五个维度审：不存在的 API/依赖、安全（密钥/注入/越权）、与契约不符、可删的过度生成、声称"应该没问题"但没有验证证据之处。评审意见全部走三线裁决，不放过也不盲从：判出 5 个真问题、驳回 6 条误报（每条写了验证理由，比如 SQL 注入怀疑——逐一核对全部值都走 `?` 占位符，字段名来自代码内白名单；密钥怀疑——`git ls-files` 确认只有 .env.example 入库）、3 条拿不准的记为「上会」（列表是否显示 LOCKED 商品、CORS 默认 *、访问量可刷），不在护栏日擅自改动已验收行为。

护栏② AI 出题考 AI：先补齐了仓库原本缺失的 docs/接口契约.md（15 个端点的事实源），再让 AI 按契约生成测试。课堂提示词原文是 Java 的 JUnit + MockMvc + mvn，但本项目是 Node 技术栈，我没有硬套，改用 node:test + supertest 连真实 MySQL 跑（绝不 mock 被测逻辑本身），共 52 条用例覆盖 10 个接口组：每个端点正常路径、边界、错误码全覆盖；测试连独立库 flea_market_test，绝不碰开发库 flea_market_ai。第一次跑出来是红屏：**39 过 / 13 红**。把红屏贴回去逐条问"是代码错还是测试错"，结论是 13 条红全部对应真缺陷，没有一条是测试写错——这正是护栏的价值。

5 个真问题（已全部修复，用红测试锁定）：①errorHandler 里 HTTP 状态码取 err.status、响应体 code 却取 err.code，MySQL 原生错误 code 是字符串，导致重复下单 HTTP=409 但 body.code=500，客户端按 body.code 判错会全部误判成服务器错误；②下单 productId 传 'abc'，Number('abc')=NaN 走到条件更新 0 行，竟返回 409「已被锁定」（应 400）；③buyerId 传 99999 幽灵买家触发外键错误 ER_NO_REFERENCED_ROW_2，中间件不认识直接 500；④编辑商品零校验，PUT {price:-50} 返回 200 且负价格真的写进了库；⑤AI 图片上传 multer 无 limits 无 fileFilter，任意类型任意大小文件全量进内存（内存型 DoS 面）。修复后同一套测试 **52 过 / 0 红**。

护栏③ CI 闸门：.github/workflows/ci.yml 进仓库，push 自动起 MySQL 服务建测试库跑测试，配了 MySQL 5.7 和 8.0 双版本矩阵，不绿不给合。已用 GitHub API 核实两个 job 均 success、「跑契约测试」步骤真实执行而不是跳过。

Git 操作记录（可验证）：e414bb4（test: 接口契约 + 52 条契约测试 + CI，945 行新增）、995e445（fix: 修复互审发现的 5 处缺陷，测试 52/52 全绿），均已推 Gitee master 和 GitHub main；今日反思录提交后打 day5 封卷 tag。本地复现命令：cd backend; npm test。

卡过什么坑：
一是环境里有两个 MySQL 实例抢 3306 端口。中途测试突然 ECONNREFUSED / Access denied，排查发现当前占着 3306 的不是平时用的 phpStudy MySQL 5.7.26（root/112233，演示商品数据都在这个实例），而是另一个 datadir 不同、root 密码为 123456 的实例。靠 `Get-NetTCPConnection -LocalPort 3306` 对进程、再用 node 脚本轮试密码才定位，切回 phpStudy 实例后恢复。教训是连不上数据库先查端口背后的进程和数据目录，别只盯着密码改配置。
二是 Windows GBK 编码坑：用子进程跑命令时 text=True 按 GBK 解码，遇到中文路径/特殊字符直接 UnicodeDecodeError，stdout 变 None 引发后续连锁报错；之后统一显式指定 UTF-8 处理。
三是 node:test 的 glob 陷阱：npm 脚本必须写成 `node --test "test/*.test.js"` 带引号，只让 *.test.js 进测试；漏了引号会把 test/helpers/init-test-db.js 也当测试文件，用例数莫名从 52 变 53 还报错。另外测试文件末尾必须显式 `after(() => pool.end())` 关连接池，否则进程挂住不退出。
四是红屏心态：13 条红刚出来时第一反应是"是不是测试写错了"，但课堂操作单说得对——把红屏贴回去逐条核对，一半情况是代码真没做校验，这次是 13 条全是代码的问题。测试逼出了手工点页面永远点不出来的缺陷（负价格落库、NaN 错误码、幽灵买家 500）。

明天打算：
把 3 个上会项带到课堂讨论（LOCKED 商品列表可见性、CORS 白名单收紧时机、访问量刷量）；后续若加登录态，第一时间收紧 CORS 并补鉴权测试；五天主体任务已封卷，整理 day1-day5 全部 tag 和完工记录，去 Gitee 发第 5 天完工报告 issue，最后跑 `python 交作业自查.py --day 5` 做终验。
