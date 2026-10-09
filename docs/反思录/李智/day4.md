今天做了什么：
完成实验四的两个核心任务：T1 接入外部能力（ECharts 统计看板）和 T2 首次部署上线。

T1 接入 ECharts 图表库（commit 178ca27）：后端新增 /api/stats/overview（分类分布+状态分布）、/api/stats/visit、/api/stats/visits 三个接口，SQL 用 GROUP BY 聚合后直接返回 ECharts 需要的 {name, value} 格式；前端新建 stats.html + stats.js，用 CDN 引入 echarts@5.5.0，渲染饼图（分类分布）和柱状图（状态分布），首页加了「统计看板」入口。README 记录了接入三步法和四个坑（CDN 加载失败兜底、数据契约对齐、COUNT 返回类型转换、容器高度）。浏览器实测：总数 24 件、图表全部渲染、控制台零报错、接口全 200。同时加了 page_views 访问统计表，首页加载自动上报访问量（T2 验收项之一）。

T2 部署上线：最终采用「后端同域托管前端 + ngrok 内网穿透」方案（commit 4c1b685）。过程中尝试了多条路线：① Render 部署后端——需要绑信用卡验证身份，放弃；② Vercel 部署前端——但前端调 ngrok 后端有跨域/警告页问题；③ 最终让后端 Express 加 express.static 托管前端静态文件，ngrok 单隧道暴露 8080 端口同时服务前端和 API，同域不跨域。数据库用 Aiven 免费 MySQL（MySQL 8.4.11，SSL 连接，24 行商品数据已导入）。手机流量实测公网地址 https://handed-calculus-safeguard.ngrok-free.dev/ 能正常打开商品列表和统计看板。

Git 操作记录（可验证）：今日提交有 178ca27（ECharts 看板+访问统计+部署手册+数据导出）、5ae85e3（DB_SSL 支持）、8f4e15b（部署配置 render.yaml+aiven-import.js）、7be0fb1（seed_data 防重复导入）、ee66b55（前端相对路径+Vercel rewrite）、4c1b685（后端同域托管前端）；GitHub 仓库 https://github.com/lizhi208/vibe-lizhi 已同步（SSH 推送，ed25519 key）；Gitee 仓库 https://gitee.com/lz208/vibe-lizhi.git 同步。

卡过什么坑：
一是 GitHub 推送被墙：国内宽带 HTTPS 推 GitHub 报 Connection reset / Could not resolve host，手机热点也 DNS 解析失败，ghproxy 代理也超时。最终用 SSH 方式（ed25519 key + GIT_SSH_COMMAND 指定 key 路径）成功推送，体会到国内连 GitHub 的正确姿势是 SSH 而非 HTTPS。
二是 Render 绑卡问题：免费档也要绑信用卡验证身份，我没有国际信用卡，放弃 Render 路线，改用 ngrok 内网穿透方案，体会到「免费」的代价和备选方案的重要性。
三是 ngrok 免费档浏览器警告页：浏览器首次访问 ngrok 域名时返回 HTML 警告页而非直接转发，导致前端 fetch 报 ERR_FAILED/ERR_SOCKET_NOT_CONNECTED。尝试加 ngrok-skip-browser-warning 头、Vercel rewrite 代理等方案，最终用「后端同域托管前端」彻底解决——前端和 API 同域就不碰 ngrok 警告页了，体会到同域部署比跨域简单得多。
四是 Aiven 密码复制错误：第一次复制的密码一直 Access denied，重置后拿到 AVNS_ 开头的正确密码才连上；seed_data.sql 的 BOM 头导致 SQL 语法错误，用 UTF8NoBom 编码重写解决；INSERT 重复主键报错，改成 INSERT IGNORE/ON DUPLICATE KEY UPDATE 解决。

明天打算：
做 day4 封卷 tag 和完工报告 issue，整理 4 天的提交历史；考虑配 HTTPS（C1 挑战）或换更稳定的部署方案（学生云服务器）；继续完善下单锁定联调和 AI 接口对接。
