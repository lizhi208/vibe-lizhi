# 第 6 天 · 翻车急救演练记录

> 课堂操作单要求：把绿项目当场搞坏再救回来——急救是姿势，不是运气。
> 本演练在 throwaway 分支 `demo/break-rescue` 上进行，故意改坏 `errorHandler`，
> 走完六步急救后切回 master 删除分支，**只留本文档作为演练产物**。

## 0. 起点

- 分支：从 master（commit `671d34f`，82/82 全绿）拉出 `demo/break-rescue`
- 目标文件：[backend/src/middlewares/errorHandler.js](../backend/src/middlewares/errorHandler.js)
- 选中它的原因：day5 刚修过"状态码归一"这条 P0，是项目里最容易回归、也最该被测试护栏锁住的地方——拿它当靶子最有教学价值。

## 1. 故意改坏（模拟"顺手改坏了还不自知"）

把 day5 修好的状态码归一逻辑改回**修复前的 bug 形态**：HTTP 状态码取 `err.status`、响应体 `code` 取 `err.code`，两者分裂。

```diff
-  // 状态码归一：只认整数（mysql 原生错误的 err.code 是字符串如 'ER_LOCK_DEADLOCK'，
-  // 绝不能拿去当 HTTP 状态码）。HTTP 状态码与响应体 code 强制一致。
-  const status = Number.isInteger(err.status)
-    ? err.status
-    : Number.isInteger(err.code)
-      ? err.code
-      : 500;
-  res.status(status).json(ApiResponse.fail(err.message || '服务器内部错误', status));
+  // [故意改坏] HTTP 状态码取 err.status，响应体 code 取 err.code —— 两者分裂
+  const httpStatus = err.status || 500;
+  const bodyCode = err.code || 500;
+  res.status(httpStatus).json(ApiResponse.fail(err.message || '服务器内部错误', bodyCode));
```

这个 bug 的危害：MySQL 原生错误的 `err.code` 是字符串（如 `'ER_LOCK_DEADLOCK'`），
被直接塞进响应体 `code`，客户端拿到 `code:'ER_LOCK_DEADLOCK'` 全部误判成服务器错误。

## 2. 红屏（stack trace 原文，一字不转述）

跑 `node --test "test/unit.error-matrix.test.js"`，4 条单测红了（原文摘录）：

```
# Subtest: 状态码归一（day5 P0-1 回归）：status=409 + code=500 → HTTP 409 且 body.code=409
    not ok 6 - 状态码归一（day5 P0-1 回归）：status=409 + code=500 → HTTP 409 且 body.code=409
      location: 'unit.error-matrix.test.js:79:3'
      failureType: 'testCodeFailure'
      error: Expected values to be strictly equal:
        500 !== 409
      code: 'ERR_ASSERTION'
      name: 'AssertionError'
      expected: 409
      actual: 500
      operator: 'strictEqual'
      stack: |-
        TestContext.<anonymous> (unit.error-matrix.test.js:84:12)
        Test.runInAsyncScope (node:async_hooks:211:14)

# Subtest: 字符串 code 不能当 HTTP 状态码：code=ER_LOCK_DEADLOCK → 500
    not ok 7 - 字符串 code 不能当 HTTP 状态码：code=ER_LOCK_DEADLOCK → 500
      location: 'unit.error-matrix.test.js:87:3'
      error: Expected values to be strictly equal:
        + actual - expected
        + 'ER_LOCK_DEADLOCK'
        - 500
      expected: 500
      actual: 'ER_LOCK_DEADLOCK'
      stack: |-
        TestContext.<anonymous> (unit.error-matrix.test.js:91:12)

# Subtest: 整数 code 兜底（无 status）→ 透传该整数
    not ok 8 - 整数 code 兜底（无 status）→ 透传该整数
      error: 500 !== 423
      expected: 423
      actual: 500
      stack: TestContext.<anonymous> (unit.error-matrix.test.js:97:12)

# Subtest: 业务 404 透传：status=404 + message=订单不存在
    not ok 11 - 业务 404 透传：status=404 + message=订单不存在
      error: 500 !== 404
      expected: 404
      actual: 500
# pass 26
# fail 4
```

## 3. 六步急救（按顺序，跳步就是赌博）

### Step 1 · 先回滚（止血）

```bash
git checkout .   # 丢弃工作区改动，回到上一个绿测试点 671d34f
```
> 原则：先止血再查因。别对着红的代码边猜边改，越改越坏。

### Step 2 · 喂回原文（不转述）

把上面红屏 stack trace **整段**贴给 AI（不转述、不概括）。
AI 一眼定位：`unit.error-matrix.test.js:84` 的断言 `500 !== 409`，
`actual:500` 来自响应体 `code`，说明 `body.code` 没跟 HTTP 状态码对齐——状态码归一逻辑被改坏了。

### Step 3 · 最小复现（必现命令）

```bash
# 不连数据库、不依赖环境，纯函数层必现：
cd backend
node --test "test/unit.error-matrix.test.js"
# → 必现 4 红，全部在 errorHandler 错误映射矩阵组
```
> 这条命令 0.3 秒跑完，比 `curl localhost:8080/...` 稳得多——单测就是最小复现。

### Step 4 · 二分定位

```bash
git diff backend/src/middlewares/errorHandler.js
```
diff 直接指到 `const httpStatus = err.status || 500;` 这段——状态码归一被换成了分裂写法。
根因：**改坏了 day5 P0-1 修复**，HTTP 状态码与响应体 code 各取各的源。

### Step 5 · 换刀（新会话，只带相关文件 + 契约）

新会话只给：`errorHandler.js` + `接口契约.md`（响应体 `{code, message, data}` 结构），
**不带上一轮的乱理**。AI 一次性恢复：
```js
const status = Number.isInteger(err.status) ? err.status
  : Number.isInteger(err.code) ? err.code : 500;
res.status(status).json(ApiResponse.fail(err.message || '服务器内部错误', status));
```
> 越改越坏的根因就是上下文里塞了太多已被推翻的旧方案——换会话清空它。

### Step 6 · 止损红线

本次 1 轮修好（`git checkout .` 即绿），未触发"同一功能 3 轮修不好 = 删掉按契约重写"的止损红线。
> 教训：如果 3 轮还红，就别缝合了——按契约删了重写，缝合比重写慢。

## 4. 绿屏（止血后验证）

```
$ node --test "test/unit.error-matrix.test.js"
ok 1 - errorHandler 错误映射矩阵
ok 2 - notFound 404 响应结构
ok 3 - parsePaging 分页解析
ok 4 - ApiResponse 响应结构
# pass 30
# fail 0

$ npm test   # 全量
# pass 82
# fail 0
```

## 5. 收尾

演练在 `demo/break-rescue` 分支完成，破坏已用 `git checkout .` 丢弃，
切回 master 删除该分支——**master 历史不被污染，只留本演练文档入库**。

## 6. 教训（一句话版）

- 测试是最好的止血钳：改坏 1 行，4 条单测 0.3 秒就抓住，比线上 500 强一万倍。
- 喂原文别转述：`500 !== 409` 比"好像状态码不对"信息量大十倍。
- 先止血再查因：对着红的代码边猜边改，是越改越坏的起点。
