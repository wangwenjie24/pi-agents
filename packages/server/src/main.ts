import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createApp, createSessionRecord } from "./app.js";
import { sessions } from "./db.js";
import { eq } from "drizzle-orm";
import type { ClientMessage } from "@pi-chat/shared";
import { convertEvent } from "./event-converter.js";
import { applyConfig, type SessionContext } from "./config.js";

export interface ServerOptions {
  port: number;
  /** 测试模式：跳过 PI SDK 创建，只做 WebSocket 协议层 */
  noSdk?: boolean;
}

export async function createServer(options: ServerOptions) {
  const ctx = createApp();
  const { app, sessionsDir, db } = ctx;
  const server = createHttpServer(app);
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws, req) => {
    let sessionId: string;
    let sessionPromise: Promise<{ session: any; sessionContext: SessionContext | null }> | null = null;

    // 解析 URL 参数，支持 sessionId 恢复
    const url = new URL(req.url ?? "/", `http://localhost`);
    const requestedSessionId = url.searchParams.get("sessionId");

    if (requestedSessionId) {
      // 使用 Drizzle 查询会话是否存在
      const rows = db
        .select()
        .from(sessions)
        .where(eq(sessions.id, requestedSessionId))
        .limit(1)
        .all();

      if (rows.length === 0) {
        send(ws, {
          type: "session_error",
          error: "会话不存在",
        });
        ws.close();
        return;
      }

      sessionId = requestedSessionId;
      send(ws, { type: "connected", sessionId });

      if (!options.noSdk) {
        sessionPromise = openAndBindSession(ws, rows[0].sessionFilePath);
      }
    } else {
      // 创建新会话：写入数据库 + 创建 JSONL 文件
      const record = createSessionRecord(db, sessionsDir);
      sessionId = record.id;
      send(ws, { type: "connected", sessionId });

      if (!options.noSdk) {
        sessionPromise = createAndBindSession(ws, sessionId, sessionsDir);
      }
    }

    ws.on("message", async (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.type) {
        case "prompt":
          if (!options.noSdk && sessionPromise) {
            const { session: agentSession } = await sessionPromise;
            await handlePrompt(ws, agentSession, msg.text);
          }
          break;
        case "abort":
          if (sessionPromise) {
            const { session: agentSession } = await sessionPromise;
            await agentSession.abort();
          }
          break;
        case "config":
          if (sessionPromise) {
            const { sessionContext } = await sessionPromise;
            if (sessionContext) {
              applyConfig(sessionContext, msg);
            }
          }
          break;
      }
    });

    ws.on("close", async () => {
      if (sessionPromise) {
        const { session } = await sessionPromise;
        session.dispose();
      }
    });
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

async function createAndBindSession(
  ws: WebSocket,
  sessionId: string,
  sessionsDir: string
): Promise<{ session: any; sessionContext: SessionContext }> {
  const {
    createAgentSession,
    SessionManager,
    AuthStorage,
    ModelRegistry,
  } = await import("@earendil-works/pi-coding-agent");

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const sessionManager = SessionManager.create(
    process.cwd(),
    sessionsDir
  );

  const { session } = await createAgentSession({
    sessionManager,
    authStorage,
    modelRegistry,
    tools: ["read", "grep", "find", "ls"],
  });

  session.subscribe((event: any) => {
    const serverMessages = convertEvent(event);
    for (const msg of serverMessages) {
      send(ws, msg);
    }
  });

  const sessionContext: SessionContext = {
    setRuntimeApiKey: (provider: string, apiKey: string) =>
      authStorage.setRuntimeApiKey(provider, apiKey),
    setModel: (provider: string, modelId: string, baseUrl: string) => {
      const model = modelRegistry.find(provider, modelId);
      if (model) {
        session.setModel(model);
      }
    },
  };

  return { session, sessionContext };
}

async function openAndBindSession(
  ws: WebSocket,
  sessionFilePath: string
): Promise<{ session: any; sessionContext: SessionContext }> {
  const {
    createAgentSession,
    SessionManager,
    AuthStorage,
    ModelRegistry,
  } = await import("@earendil-works/pi-coding-agent");

  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);

  const sessionManager = SessionManager.open(sessionFilePath);

  const { session } = await createAgentSession({
    sessionManager,
    authStorage,
    modelRegistry,
    tools: ["read", "grep", "find", "ls"],
  });

  session.subscribe((event: any) => {
    const serverMessages = convertEvent(event);
    for (const msg of serverMessages) {
      send(ws, msg);
    }
  });

  const sessionContext: SessionContext = {
    setRuntimeApiKey: (provider: string, apiKey: string) =>
      authStorage.setRuntimeApiKey(provider, apiKey),
    setModel: (provider: string, modelId: string, baseUrl: string) => {
      const model = modelRegistry.find(provider, modelId);
      if (model) {
        session.setModel(model);
      }
    },
  };

  return { session, sessionContext };
}

async function handlePrompt(
  ws: WebSocket,
  agentSession: any,
  text: string
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

// ── 默认启动入口 ──
const IS_MAIN =
  process.argv[1]?.includes("main.ts") ||
  process.argv[1]?.includes("main.js");

if (IS_MAIN) {
  const PORT = parseInt(process.env.PORT ?? "8080", 10);
  createServer({ port: PORT }).then(() => {
    console.log(`Pi Chat server listening on port ${PORT}`);
  });
}
