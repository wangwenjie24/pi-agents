import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type Database from "better-sqlite3";

describe("会话 REST API", () => {
  let app: ReturnType<typeof createApp>["app"];
  let sqlite: Database.Database;
  let cleanup: () => void;
  let sessionsDir: string;

  beforeAll(() => {
    sessionsDir = mkdtempSync(join(tmpdir(), "pi-chat-test-"));
    const result = createApp(":memory:", sessionsDir);
    app = result.app;
    sqlite = result.sqlite;
    cleanup = result.cleanup;
  });

  afterAll(() => {
    cleanup();
    rmSync(sessionsDir, { recursive: true, force: true });
  });

  // ── GET /health ──

  describe("GET /health", () => {
    it("返回 ok 状态", async () => {
      const res = await request(app).get("/health").expect(200);
      expect(res.body).toEqual({ status: "ok" });
    });
  });

  // ── POST /api/sessions ──

  describe("POST /api/sessions", () => {
    it("创建会话返回 201 及会话数据", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .send({ name: "测试会话" })
        .expect(201);

      expect(res.body).toMatchObject({
        id: expect.any(String),
        name: "测试会话",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });

      const row = sqlite
        .prepare("SELECT * FROM sessions WHERE id = ?")
        .get(res.body.id) as any;
      expect(row).toBeDefined();
      expect(row.name).toBe("测试会话");
      expect(row.sessionFilePath).toContain(res.body.id);
    });

    it("创建会话时 JSONL 文件被同步创建", async () => {
      const res = await request(app)
        .post("/api/sessions")
        .send({ name: "文件测试" })
        .expect(201);

      const row = sqlite
        .prepare("SELECT * FROM sessions WHERE id = ?")
        .get(res.body.id) as any;
      const { existsSync } = await import("fs");
      expect(existsSync(row.sessionFilePath)).toBe(true);
    });
  });

  // ── GET /api/sessions ──

  describe("GET /api/sessions", () => {
    it("返回所有会话列表", async () => {
      await request(app).post("/api/sessions").send({ name: "会话A" });
      await request(app).post("/api/sessions").send({ name: "会话B" });

      const res = await request(app).get("/api/sessions").expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      const names = res.body.map((s: any) => s.name);
      expect(names).toContain("会话A");
      expect(names).toContain("会话B");
    });
  });

  // ── DELETE /api/sessions/:id ──

  describe("DELETE /api/sessions/:id", () => {
    it("删除已存在的会话，返回 204", async () => {
      const createRes = await request(app)
        .post("/api/sessions")
        .send({ name: "待删除" });
      const sessionId = createRes.body.id;

      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .expect(204);

      // 验证数据库记录已删除
      const row = sqlite
        .prepare("SELECT * FROM sessions WHERE id = ?")
        .get(sessionId);
      expect(row).toBeUndefined();
    });

    it("删除会话时 JSONL 文件同步清理", async () => {
      const createRes = await request(app)
        .post("/api/sessions")
        .send({ name: "文件删除测试" });
      const sessionId = createRes.body.id;

      // 确认文件存在
      const row = sqlite
        .prepare("SELECT * FROM sessions WHERE id = ?")
        .get(sessionId) as any;
      const { existsSync } = await import("fs");
      expect(existsSync(row.sessionFilePath)).toBe(true);

      await request(app)
        .delete(`/api/sessions/${sessionId}`)
        .expect(204);

      // 确认文件已删除
      expect(existsSync(row.sessionFilePath)).toBe(false);
    });

    it("会话不存在时返回 404", async () => {
      await request(app)
        .delete("/api/sessions/nonexistent-id")
        .expect(404);
    });
  });

  // ── PATCH /api/sessions/:id ──

  describe("PATCH /api/sessions/:id", () => {
    it("重命名已存在的会话", async () => {
      const createRes = await request(app)
        .post("/api/sessions")
        .send({ name: "原名" });
      const sessionId = createRes.body.id;

      const res = await request(app)
        .patch(`/api/sessions/${sessionId}`)
        .send({ name: "新名字" })
        .expect(200);

      expect(res.body.name).toBe("新名字");
      expect(res.body.id).toBe(sessionId);
    });

    it("会话不存在时返回 404", async () => {
      await request(app)
        .patch("/api/sessions/nonexistent-id")
        .send({ name: "新名字" })
        .expect(404);
    });

    it("不传 name 字段返回 400", async () => {
      const createRes = await request(app)
        .post("/api/sessions")
        .send({ name: "校验测试" });
      const sessionId = createRes.body.id;

      await request(app)
        .patch(`/api/sessions/${sessionId}`)
        .send({})
        .expect(400);
    });

    it("name 为空字符串返回 400", async () => {
      const createRes = await request(app)
        .post("/api/sessions")
        .send({ name: "空名测试" });
      const sessionId = createRes.body.id;

      await request(app)
        .patch(`/api/sessions/${sessionId}`)
        .send({ name: "   " })
        .expect(400);
    });
  });

  // ── GET /api/sessions/:id/messages ──

  describe("GET /api/sessions/:id/messages", () => {
    it("会话不存在时返回 404", async () => {
      await request(app)
        .get("/api/sessions/nonexistent-id/messages")
        .expect(404);
    });

    it("空会话返回空消息数组", async () => {
      const createRes = await request(app)
        .post("/api/sessions")
        .send({ name: "空会话" });
      const sessionId = createRes.body.id;

      const res = await request(app)
        .get(`/api/sessions/${sessionId}/messages`)
        .expect(200);

      expect(res.body).toEqual({ messages: [] });
    });
  });
});
