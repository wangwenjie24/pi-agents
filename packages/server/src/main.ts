import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import type { ClientMessage } from "@pi-chat/shared";
import { convertEvent } from "./event-converter.js";

export interface ServerOptions {
  port: number;
  /** 测试模式：跳过 PI SDK 创建，只做 WebSocket 协议层 */
  noSdk?: boolean;
}

export async function startServer(options: ServerOptions) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  // 健康检查
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  wss.on("connection", (ws) => {
    const sessionId = randomUUID();
    let sessionPromise: Promise<any> | null = null;

    // 连接建立，发送 connected
    send(ws, { type: "connected", sessionId });

    ws.on("message", async (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return; // 无效 JSON，忽略
      }

      switch (msg.type) {
        case "prompt":
          if (!options.noSdk && sessionPromise) {
            const agentSession = await sessionPromise;
            await handlePrompt(ws, agentSession, msg.text);
          }
          break;
        case "abort":
          if (sessionPromise) {
            const agentSession = await sessionPromise;
            await agentSession.abort();
          }
          break;
        case "config":
          // TODO: 处理用户配置（provider/model/apiKey）
          break;
      }
    });

    ws.on("close", async () => {
      if (sessionPromise) {
        const agentSession = await sessionPromise;
        agentSession.dispose();
      }
    });

    // 在非测试模式下，连接时创建 Agent Session
    if (!options.noSdk) {
      sessionPromise = createAndBindSession(ws, sessionId);
    }
  });

  return new Promise<{ stop: () => Promise<void> }>((resolve) => {
    server.listen(options.port, () => {
      resolve({
        stop: () =>
          new Promise<void>((res, rej) => {
            wss.close((err) => (err ? rej(err) : res()));
          }),
      });
    });
  });
}

function send(ws: WebSocket, msg: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

async function createAndBindSession(ws: WebSocket, sessionId: string) {
  const {
    createAgentSession,
    SessionManager,
    AuthStorage,
    ModelRegistry,
  } = await import("@earendil-works/pi-coding-agent");

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const { session } = await createAgentSession({
    sessionManager: SessionManager.inMemory(),
    authStorage,
    modelRegistry,
    tools: ["read", "grep", "find", "ls"],
  });

  // 订阅事件并转换为自定义协议发送给前端
  session.subscribe((event: any) => {
    const serverMessages = convertEvent(event);
    for (const msg of serverMessages) {
      send(ws, msg);
    }
  });

  return session;
}

async function handlePrompt(
  ws: WebSocket,
  agentSession: any,
  text: string,
) {
  try {
    if (!agentSession) {
      send(ws, { type: "chat_error", error: "Agent session 尚未就绪" });
      return;
    }
    await agentSession.prompt(text);
  } catch (err: any) {
    send(ws, { type: "chat_error", error: err.message ?? String(err) });
  }
}

// ── 默认启动入口（仅直接执行时运行） ──
// 使用 import.meta.url 判断是否为入口文件
const IS_MAIN =
  process.argv[1]?.includes("main.ts") ||
  process.argv[1]?.includes("main.js");

if (IS_MAIN) {
  const PORT = parseInt(process.env.PORT ?? "8080", 10);
  startServer({ port: PORT }).then(() => {
    console.log(`Pi Chat server listening on port ${PORT}`);
  });
}
