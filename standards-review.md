# Standards Review

审查范围：HEAD (0dde053) 与工作区差异，对照 AGENTS.md、CONTEXT.md、tsconfig.base.json 中的明文规范。

## 硬违规

无。

## 需关注项

### 1. DDL 重复定义 — 迁移规范意图冲突

**文件**: `packages/server/src/db.ts` (L14–23) 与 `migrations/20260611102000_create_sessions_table.sql`

**相关标准**: `AGENTS.md` — 数据库迁移规范："涉及数据库结构或数据变更时，**必须**在 `migrations/` 目录下生成迁移文件，供后续生产环境按顺序执行。"

`initDb()` 内嵌 `CREATE TABLE IF NOT EXISTS sessions`，与迁移文件定义相同的表结构。两个来源一旦不同步（列名、约束），测试/开发（走 `initDb`）与生产（走迁移文件）就会出现分歧。迁移文件本身命名合规（`YYYYMMDDHHmmss_描述.sql`）且幂等（`IF NOT EXISTS`）。

**建议**: `initDb` 应读取并执行 `migrations/` 下的 SQL 文件，而非内联 DDL；或者将 Drizzle schema 作为唯一真相源，迁移文件由工具（如 drizzle-kit）生成。

### 2. `/health` 端点被删除但未迁移

**文件**: `packages/server/src/main.ts`（旧 L20–22 被移除）、`packages/server/src/app.ts`（未注册）

原 `startServer` 中的 `app.get("/health", ...)` 在重构到 `createApp` 后丢失。如果该端点在生产环境被监控系统或负载均衡器使用，会导致误报。这是功能回退而非规范违反。

### 3. Drizzle 实例初始化后未使用（死代码）

**文件**: `packages/server/src/db.ts` (L13)

```ts
const _db = drizzle(sqlite);
```

创建了 Drizzle 实例但赋给 `_db` 后从未使用或返回。`app.ts` 又自行调用 `drizzle(sqlite)` 创建了第二个实例。TypeScript `strict: true` 下不会报错（无 `noUnusedLocals` 配置），但这属于冗余初始化。

### 4. 同一表混用原始 SQL 与 ORM

**文件**: `packages/server/src/main.ts` (L22–26)

```ts
const row = sqliteDb
  .prepare("SELECT * FROM sessions WHERE id = ?")
  .get(requestedSessionId) as any;
```

WebSocket 连接恢复路径使用原始 SQL 查询 `sessions` 表，而 REST 路由（`app.ts`）统一使用 Drizzle ORM。同一张表的访问方式不一致，增加维护成本。此外 `as any` 绕过了 TypeScript 严格类型检查。

### 5. 路由处理函数使用 `async` 但底层同步

**文件**: `packages/server/src/app.ts`（所有路由处理函数）

所有 Express 路由标记为 `async` 并 `await db.select()...`，但 `drizzle-orm/better-sqlite3` 是同步驱动，`.select()` 返回的不是 Promise。`await` 在同步值上无害但误导读者以为存在异步 I/O。这是判断性问题，非硬违规。

---

**总结**: 迁移文件命名和幂等性合规；CONTEXT.md 术语（Session、Session 元信息）使用正确；TypeScript strict 模式无冲突。主要风险在于 DDL 双来源（第 1 项）和功能回退（第 2 项）。
