import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WebSocket } from "ws";
import { startServer } from "./main.js";

describe("WebSocket 服务器", () => {
  const PORT = 9876;
  let stop: () => Promise<void>;

  beforeAll(async () => {
    const result = await startServer({ port: PORT, noSdk: true });
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

    // 服务器收到 prompt 后应保持连接（noSdk 模式下不做实际 LLM 调用）
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
});
