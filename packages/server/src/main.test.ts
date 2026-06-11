import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { createServer } from "./main.js";
import { createApp } from "./app.js";
import { mkdtempSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

describe("WebSocket 服务器", () => {
  const PORT = 9876;
  let stop: () => Promise<void>;

  beforeAll(async () => {
    const result = await createServer({ port: PORT, noSdk: true });
    stop = result.stop;
  });

  afterAll(async () => {
    await stop();
  });

  it("客户端连接后收到 connected 消息", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    const firstMessage = await new Promise<any>((resolve, reject) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
        ws.close();
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    expect(firstMessage.type).toBe("connected");
    expect(firstMessage.sessionId).toBeDefined();
  });

  it("发送 prompt 消息后服务器不会断开连接", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "prompt", text: "hello" }));

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });

  it("发送未知类型消息不会导致服务器崩溃", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(JSON.stringify({ type: "unknown" }));

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });

  // ── 会话恢复 ──

  it("连接时传 sessionId 可恢复已有会话", async () => {
    // 第一步：通过 HTTP 创建一个会话
    const http = await import("http");
    const createRes = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: PORT,
          path: "/api/sessions",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve(JSON.parse(body)));
        }
      );
      req.on("error", reject);
      req.write(JSON.stringify({ name: "恢复测试" }));
      req.end();
    });

    const sessionId = createRes.id;

    // 第二步：用 sessionId 建立 WebSocket 连接
    const ws = new WebSocket(`ws://localhost:${PORT}?sessionId=${sessionId}`);
    const firstMessage = await new Promise<any>((resolve, reject) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
        ws.close();
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    expect(firstMessage.type).toBe("connected");
    expect(firstMessage.sessionId).toBe(sessionId);
  });

  it("连接时传不存在的 sessionId 返回错误", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}?sessionId=nonexistent`);
    const firstMessage = await new Promise<any>((resolve, reject) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
        ws.close();
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    expect(firstMessage.type).toBe("session_error");
    expect(firstMessage.error).toBeDefined();
  });

  // ── WebSocket 新建会话写入数据库 ──

  it("WebSocket 新建会话后，通过 REST GET 确认记录存在", async () => {
    // 通过 WebSocket 连接（不传 sessionId）触发新建会话
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    const connectedMsg = await new Promise<any>((resolve, reject) => {
      ws.on("message", (data) => {
        resolve(JSON.parse(data.toString()));
        ws.close();
      });
      ws.on("error", reject);
      setTimeout(() => reject(new Error("timeout")), 5000);
    });

    expect(connectedMsg.type).toBe("connected");
    const sessionId = connectedMsg.sessionId;
    expect(sessionId).toBeDefined();

    // 通过 REST GET 确认数据库中有这条记录
    const http = await import("http");
    const getRes = await new Promise<any>((resolve, reject) => {
      const req = http.request(
        {
          hostname: "localhost",
          port: PORT,
          path: `/api/sessions`,
          method: "GET",
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve(JSON.parse(body)));
        }
      );
      req.on("error", reject);
      req.end();
    });

    const found = getRes.find((s: any) => s.id === sessionId);
    expect(found).toBeDefined();
    expect(found.name).toBe("新会话");
  });
});
