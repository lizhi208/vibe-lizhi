# 部署配置说明（路线 B：GitHub + Render + Aiven + Vercel）

## 文件清单

| 文件 | 用途 |
|---|---|
| `render.yaml` | Render 后端部署 Blueprint 配置 |
| `aiven-import.js` | Aiven MySQL 一键导入 schema + seed_data |
| `vercel.json`（可选） | Vercel 前端配置（纯静态项目通常不需要） |

## 前置条件

1. **GitHub 仓库已同步**（需要你的 `ghp_` token，见下）
2. **Aiven 免费 MySQL 已创建**（https://aiven.io，Free plan）
3. **Render 账号已注册**（https://render.com，建议 GitHub 登录）
4. **Vercel 账号已注册**（https://vercel.com，建议 GitHub 登录）

## 第 1 步：同步代码到 GitHub

你需要 GitHub Personal Access Token（classic，`ghp_` 开头，勾 `repo` 权限）：

```bash
# 在本地项目根目录执行（替换 <USERNAME> 和 <TOKEN>）
git push https://<USERNAME>:<TOKEN>@github.com/<USERNAME>/vibe-lizhi.git master
```

或把 Gitee 仓库导入 GitHub：GitHub → New repository → Import repository → 填 Gitee URL。

## 第 2 步：Aiven 创建免费 MySQL

1. https://aiven.io → Sign up → Create service → MySQL → Free plan → 选区域（如新加坡）
2. 等状态变 Running，记下：
   - Host（如 `flea-mysql-xxx.aivencloud.com`）
   - Port（如 `23456`，不是 3306）
   - User = `avnadmin`
   - Password
   - 默认数据库 = `defaultdb`

## 第 3 步：导入数据到 Aiven

```bash
cd vibe-lizhi
node deploy/aiven-import.js <Aiven_Host> <Aiven_Port> <Aiven_Password>
```

成功输出：`products 表共 24 行`。

## 第 4 步：Render 部署后端

### 方式 A：Blueprint（推荐，自动读 render.yaml）

1. Render Dashboard → New → Blueprint
2. 连你的 GitHub 仓库 `vibe-lizhi`
3. Render 自动识别 `deploy/render.yaml`，点 Apply
4. 在 Environment 里填 `sync: false` 的变量：DB_HOST、DB_PORT、DB_PASSWORD

### 方式 B：手动 Web Service

1. New → Web Service → 连 GitHub 仓库
2. Root Directory = `backend`
3. Build = `npm install --production`
4. Start = `node src/server.js`
5. Environment 填：
   ```
   PORT=8080
   DB_HOST=<Aiven Host>
   DB_PORT=<Aiven Port>
   DB_USER=avnadmin
   DB_PASSWORD=<Aiven Password>
   DB_NAME=defaultdb
   DB_SSL=true
   FRONTEND_ORIGIN=*
   ```

部署成功后得到后端地址：`https://flea-market-api.onrender.com`

## 第 5 步：改前端指向线上后端

改 `frontend/js/config.js`：

```js
window.API_CONFIG = {
  BASE_URL: 'https://flea-market-api.onrender.com/api'
};
```

提交并推送到 GitHub（触发 Vercel 自动重新部署）。

## 第 6 步：Vercel 部署前端

1. Vercel → Add New → Project → 选 GitHub 仓库 `vibe-lizhi`
2. Root Directory = `frontend`
3. Framework = Other（纯静态）
4. Deploy

得到前端地址：`https://vibe-lizhi-xxx.vercel.app`

## 第 7 步：验收

手机（流量）打开 Vercel 地址：
- 商品列表显示（数据来自 Aiven）
- 统计看板图表正常
- 翻页、搜索正常

## 常见问题

| 问题 | 解决 |
|---|---|
| Render 连不上 Aiven | 检查 `DB_SSL=true` 是否设置；Aiven 免费档允许所有 IP 连接，无需白名单 |
| 首次访问慢 | Render 免费档休眠，等 30-60 秒冷启动 |
| 前端调接口 404 | 检查 `frontend/js/config.js` 的 `BASE_URL` 是否改成 Render 地址 |
| 图表不显示 | 检查浏览器 Console 是否 ECharts CDN 被墙；必要时下载 echarts.min.js 到本地引用 |

## 下一步

- 把 `docs/部署手册.md` 里的 `⏳ 待填` 改成实际地址
- 发「第 4 天完工报告」issue 到 Gitee 仓库
