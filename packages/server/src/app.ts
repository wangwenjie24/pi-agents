import express from "express";
import { initDb, sessions } from "./db.js";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { randomUUID } from "crypto";
import { mkdirSync, existsSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type Database from "better-sqlite3";

// __dirname 等价（ESM 没有 __dirname）
const __dirname = dirname(fileURLToPath(import.meta.url));

export interface AppContext {
  app: express.Express;
  sqlite: Database.Database;
  db: ReturnType<typeof drizzle>;
  sessionsDir: string;
  cleanup: () => void;
}

export interface CreateSessionInput {
  name?: string;
}

export interface SessionRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sessionFilePath: string;
}

/**
 * 创建会话的共享逻辑：插入数据库 + 创建 JSONL 文件。
 * 供 REST API 和 WebSocket 共用。
 */
export function createSessionRecord(
  db: ReturnType<typeof drizzle>,
  sessionsDir: string,
  input: CreateSessionInput = {}
): SessionRecord {
  const id = randomUUID();
  const name = input.name ?? "新会话";
  const now = new Date().toISOString();
  const sessionFilePath = join(sessionsDir, `${id}.jsonl`);

  // 确保 JSONL 文件存在
  mkdirSync(dirname(sessionFilePath), { recursive: true });
  if (!existsSync(sessionFilePath)) {
    writeFileSync(sessionFilePath, "", "utf-8");
  }

  db.insert(sessions).values({
    id,
    name,
    createdAt: now,
    updatedAt: now,
    sessionFilePath,
  }).run(); // better-sqlite3 同步执行

  return { id, name, createdAt: now, updatedAt: now, sessionFilePath };
}

export function createApp(
  dbPath: string = ":memory:",
  sessionsDir?: string
): AppContext {
  // 从 packages/server/src 上溯三级到项目根，再拼接 migrations/
  const migrationsDir = join(__dirname, "..", "..", "..", "migrations");
  const sqlite = initDb(dbPath, migrationsDir);
  const db = drizzle(sqlite);

  // 会话 JSONL 文件存放目录
  const dir = sessionsDir ?? join(process.cwd(), ".sessions");
  mkdirSync(dir, { recursive: true });

  const app = express();
  app.use(express.json());

  // ── Health check ──

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // ── REST API：会话管理 ──

  // POST /api/sessions — 创建会话
  app.post("/api/sessions", async (_req, res) => {
    const record = createSessionRecord(db, dir, {
      name: (_req.body as any).name,
    });
    res.status(201).json({
      id: record.id,
      name: record.name,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  });

  // GET /api/sessions — 列出所有会话
  app.get("/api/sessions", async (_req, res) => {
    const rows = db.select().from(sessions).orderBy(sessions.createdAt).all();
    res.json(rows);
  });

  // GET /api/sessions/:id/messages — 获取会话消息历史
  app.get("/api/sessions/:id/messages", async (req, res) => {
    const { id } = req.params;
    const rows = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)
      .all();

    if (rows.length === 0) {
      res.status(404).json({ error: "会话不存在" });
      return;
    }

    // 后续由 PI SDK SessionManager 读取 JSONL 文件中的实际消息
    res.json({ messages: [] });
  });

  // PATCH /api/sessions/:id — 重命名会话
  app.patch("/api/sessions/:id", async (req, res) => {
    const { id } = req.params;
    const body = req.body as { name?: string };

    // 校验 name 必须存在且非空
    if (!body.name || typeof body.name !== "string" || body.name.trim() === "") {
      res.status(400).json({ error: "name 字段不能为空" });
      return;
    }

    const rows = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)
      .all();

    if (rows.length === 0) {
      res.status(404).json({ error: "会话不存在" });
      return;
    }

    const now = new Date().toISOString();
    db.update(sessions)
      .set({ name: body.name, updatedAt: now })
      .where(eq(sessions.id, id))
      .run();

    res.json({ ...rows[0], name: body.name, updatedAt: now });
  });

  // DELETE /api/sessions/:id — 删除会话
  app.delete("/api/sessions/:id", async (req, res) => {
    const { id } = req.params;

    const rows = db
      .select()
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1)
      .all();

    if (rows.length === 0) {
      res.status(404).json({ error: "会话不存在" });
      return;
    }

    // 删除 JSONL 文件
    const filePath = rows[0].sessionFilePath;
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }

    // 删除数据库记录
    db.delete(sessions).where(eq(sessions.id, id)).run();

    res.status(204).send();
  });

  return { app, sqlite, db, sessionsDir: dir, cleanup: () => sqlite.close() };
}
