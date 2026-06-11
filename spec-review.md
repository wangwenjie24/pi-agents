# Spec Review — Issue #3 会话管理

## (a) 缺失或部分实现的需求

### 1. POST /api/sessions 创建会话时未同步写入数据库记录（仅部分完成）
- **Spec**: "创建新会话时同时写入数据库记录和创建 JSONL 文件"
- **证据**: WebSocket 新建会话分支（`main.ts` 无 `sessionId` 分支）仅发送 `connected` 消息，**未调用数据库插入**。HTTP `POST /api/sessions` 做了数据库写入和 JSONL 创建，但 WebSocket 连接创建的会话与数据库完全脱节。这导致通过 WebSocket 新建的会话无法在 REST API 列表中出现，也无法被后续恢复。

### 2. 前端侧边栏和页面恢复完全缺失
- **Spec**: "前端侧边栏：会话列表展示、新建会话按钮、删除/重命名操作、点击切换会话、当前会话高亮" 及 "前端记住上次活跃的 sessionId（localStorage），页面加载时自动连接并恢复该会话的历史消息"
- **证据**: diff 和新文件中无任何前端代码变更（`packages/client/`、`packages/web/` 均无改动）。整个前端部分（需求 4、5）未实现。

### 3. GET /api/sessions/:id/messages 返回空数组，未读取实际消息历史
- **Spec**: "五个会话管理接口……GET /api/sessions/:id/messages（消息历史）"
- **证据**: `app.ts:70` 写死 `res.json({ messages: [] })`，注释说"后续由 PI SDK SessionManager 读取 JSONL 文件"，但未实现。切换会话后无法恢复历史消息。

### 4. /health 端点被移除
- **Spec**: 虽非 Issue #3 直接要求，但 diff 移除了原有 `/health` 端点且未在 `app.ts` 中重建，属于回归。

### 5. 删除会话时 WebSocket 层未同步清理
- **Spec**: "删除会话时，数据库记录和 JSONL 文件同步清理"
- **证据**: REST DELETE 端点做了清理，但 spec 还隐含活跃 WebSocket 连接应被断开或通知，此行为缺失。

## (b) Scope creep（Spec 未要求的行为）

### 1. `openAndBindSession` 函数 — SessionManager.open() 恢复
- `main.ts` 新增了 `openAndBindSession()` 使用 `SessionManager.open(sessionFilePath)` 恢复会话。Spec 第 3 条确实提到"WebSocket 连接时可指定 sessionId 恢复已有会话（使用 SessionManager.open()）"，所以这是合理的，但实现中恢复分支从数据库读取 `sessionFilePath` 时使用了原始 SQL（`sqlite.prepare().get()`）而非 Drizzle ORM，与项目其余部分风格不一致。

## (c) 实现看起来有问题

### 1. PATCH /api/sessions/:id 未校验 name 字段
- **位置**: `app.ts:82-104`
- `name` 可能为 `undefined`（请求体未包含 name），此时 `db.update().set({ name: undefined })` 会将 name 列设为 NULL，违反 `NOT NULL` 约束，导致 500 错误。应加前置校验。

### 2. WebSocket 新建会话与数据库脱节（与 (a).1 相同，但此处强调正确性风险）
- **位置**: `main.ts` 无 sessionId 分支，`sessionId = randomUUID()` 后仅发送 WebSocket 消息，不会在数据库中创建记录。若用户刷新页面后通过 REST API 查询会话列表，该会话不存在。

### 3. `createApp` 中 `db` 变量遮蔽了 drizzle 实例
- **位置**: `db.ts:14` 中 `const _db = drizzle(sqlite)` 以下划线丢弃，而 `app.ts:16` 中 `const db = drizzle(sqlite)` 重新创建。`initDb` 内部创建的 drizzle 实例未被使用，造成不必要的初始化开销和可能的混淆。

### 4. 测试中 JSONL 文件清理不完整
- `sessions.test.ts` 中 POST 测试在 `:memory:` 数据库但 `sessionsDir` 默认指向 `process.cwd()/.sessions`，测试后未清理创建的 JSONL 文件目录（仅关闭了数据库连接）。

## 总结

后端 REST API 五个端点和数据库层基本就位，集成测试覆盖了正常流程和 404 边界。但 **WebSocket 新建会话未写入数据库**、**前端完全缺失**、**消息历史 API 是空壳** 三个问题使得整体 spec 完成度大约在 40%（后端部分 ~70%，前端 0%）。
