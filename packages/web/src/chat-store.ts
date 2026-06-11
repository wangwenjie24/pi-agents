import { create } from "zustand";
import type { ServerMessage, ClientMessage } from "@pi-chat/shared";
import { useConfigStore } from "./config-store.js";
import {
  getNextRetryDelay,
  resetRetryCount,
  type ReconnectState,
} from "./reconnect-strategy.js";

// ── 类型定义 ──

export interface ToolCall {
  toolName: string;
  status: "running" | "done";
  output?: string;
  result?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done" | "aborted";
  toolCalls?: ToolCall[];
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type ConnectionStatus =
  | "connected"
  | "disconnected"
  | "connecting"
  | "reconnecting";

// ── 状态 ──

export interface ChatState {
  // WebSocket
  connected: boolean;
  connectionStatus: ConnectionStatus;
  isRunning: boolean;
  ws: WebSocket | null;

  // 消息（当前活动会话的）
  messages: ChatMessage[];
  // 按 sessionId 隔离的消息缓存
  messagesMap: Record<string, ChatMessage[]>;

  // 会话管理
  sessions: Session[];
  activeSessionId: string | null;

  // 断连期间的消息缓冲
  pendingMessages: string[];

  // WebSocket actions
  connect: (url: string, sessionId?: string) => void;
  disconnect: () => void;
  sendPrompt: (text: string) => void;
  sendAbort: () => void;

  // 会话 CRUD
  fetchSessions: () => Promise<void>;
  createSession: (name?: string) => Promise<Session>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  switchSession: (id: string) => void;

  // 内部
  _onServerMessage: (msg: ServerMessage) => void;
}

let nextId = 1;
const WS_URL = "ws://localhost:8080";
const LS_KEY = "pi-chat:activeSessionId";

// ── 重连内部状态（不在 Zustand 中暴露） ──

let _reconnectState: ReconnectState = { attemptCount: 0 };
let _reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _isIntentionalDisconnect = false;
let _lastConnectUrl: string = "";
let _lastSessionId: string | undefined = undefined;

function clearReconnectTimer() {
  if (_reconnectTimer !== null) {
    clearTimeout(_reconnectTimer);
    _reconnectTimer = null;
  }
}

// ── 辅助函数 ──

function loadActiveSessionId(): string | null {
  try { return localStorage.getItem(LS_KEY); } catch { return null; }
}

function saveActiveSessionId(id: string | null) {
  try {
    if (id) localStorage.setItem(LS_KEY, id);
    else localStorage.removeItem(LS_KEY);
  } catch { /* noop */ }
}

/** 将当前 messages 刷入 messagesMap[sessionId] */
function flushMessages(
  state: Pick<ChatState, "messages" | "messagesMap" | "activeSessionId">
): Pick<ChatState, "messagesMap"> {
  const { messages, messagesMap, activeSessionId } = state;
  if (!activeSessionId) return { messagesMap };
  return {
    messagesMap: {
      ...messagesMap,
      [activeSessionId]: messages,
    },
  };
}

export const useChatStore = create<ChatState>((set, get) => ({
  connected: false,
  connectionStatus: "disconnected",
  isRunning: false,
  messages: [],
  messagesMap: {},
  ws: null,
  sessions: [],
  activeSessionId: null,
  pendingMessages: [],

  // ── WebSocket ──

  connect(url: string, sessionId?: string) {
    // 清除可能存在的重连定时器
    clearReconnectTimer();

    // 先断开旧连接（标记为非主动断开，避免触发 disconnect 逻辑）
    const oldWs = get().ws;
    if (oldWs) {
      _isIntentionalDisconnect = true;
      oldWs.close();
    }

    _isIntentionalDisconnect = false;
    _lastConnectUrl = url;
    _lastSessionId = sessionId ?? get().activeSessionId ?? undefined;

    const wsUrl = _lastSessionId ? `${url}?sessionId=${_lastSessionId}` : url;
    const ws = new WebSocket(wsUrl);

    set({ ws, connectionStatus: "connecting" });

    ws.onopen = () => {
      _reconnectState = resetRetryCount(_reconnectState);
      set({ connected: true, ws, connectionStatus: "connected" });

      // 连接建立后自动发送用户配置
      const config = useConfigStore.getState().getConfigMessage();
      if (config.provider || config.model || config.baseUrl || config.apiKey) {
        ws.send(JSON.stringify(config));
      }

      // 发送缓冲消息
      const pending = get().pendingMessages;
      if (pending.length > 0) {
        for (const text of pending) {
          const clientMsg: ClientMessage = { type: "prompt", text };
          ws.send(JSON.stringify(clientMsg));
        }
        set({ pendingMessages: [] });
      }
    };

    ws.onclose = () => {
      set({ connected: false, ws: null });

      if (_isIntentionalDisconnect) {
        set({ connectionStatus: "disconnected" });
        return;
      }

      // 自动重连
      set({ connectionStatus: "reconnecting" });
      scheduleReconnect();
    };

    ws.onerror = () => {
      // onerror 之后浏览器通常会再触发 onclose
      // 所以这里不重复设置状态，只记录
    };

    ws.onmessage = (e) => {
      try {
        const msg: ServerMessage = JSON.parse(e.data);
        get()._onServerMessage(msg);
      } catch {
        // ignore invalid messages
      }
    };
  },

  disconnect() {
    _isIntentionalDisconnect = true;
    clearReconnectTimer();
    get().ws?.close();
    set({ ws: null, connected: false, connectionStatus: "disconnected" });
  },

  sendPrompt(text: string) {
    const { ws, connected, connectionStatus } = get();

    // 断连或重连中时，缓冲消息
    if (!ws || ws.readyState !== WebSocket.OPEN || !connected) {
      if (connectionStatus === "reconnecting" || connectionStatus === "disconnected") {
        set((s) => ({
          pendingMessages: [...s.pendingMessages, text],
        }));
      }
      return;
    }

    const { messages: currentMessages } = get();

    const userMsg: ChatMessage = {
      id: `msg-${nextId++}`,
      role: "user",
      content: text,
      status: "done",
    };

    const assistantMsg: ChatMessage = {
      id: `msg-${nextId++}`,
      role: "assistant",
      content: "",
      status: "streaming",
    };

    const next = [...currentMessages, userMsg, assistantMsg];

    set((s) => {
      const flushed = flushMessages({ ...s, messages: next });
      return { messages: next, ...flushed, isRunning: true };
    });

    const clientMsg: ClientMessage = { type: "prompt", text };
    ws.send(JSON.stringify(clientMsg));
  },

  sendAbort() {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    // 立即将最后一条 assistant 消息标记为 aborted
    const { messages } = get();
    const updated = [...messages];
    const last = updated[updated.length - 1];
    if (last && last.role === "assistant" && last.status === "streaming") {
      updated[updated.length - 1] = { ...last, status: "aborted" };
      set((s) => {
        const flushed = flushMessages({ ...s, messages: updated });
        return {
          messages: updated,
          messagesMap: flushed.messagesMap,
          isRunning: false,
        };
      });
    }

    ws.send(JSON.stringify({ type: "abort" }));
  },

  // ── 会话 CRUD ──

  async fetchSessions() {
    const res = await fetch("/api/sessions");
    const sessions: Session[] = await res.json();
    set({ sessions });
  },

  async createSession(name?: string) {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name ?? "新会话" }),
    });
    const session: Session = await res.json();
    set((s) => ({ sessions: [session, ...s.sessions] }));
    return session;
  },

  async deleteSession(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });

    set((s) => {
      // 先刷当前消息
      const flushed = flushMessages(s);
      const newMessagesMap = { ...flushed.messagesMap };
      delete newMessagesMap[id];

      const isActive = s.activeSessionId === id;
      return {
        sessions: s.sessions.filter((sess) => sess.id !== id),
        messagesMap: newMessagesMap,
        activeSessionId: isActive ? null : s.activeSessionId,
        messages: isActive ? [] : s.messages,
      };
    });

    // 如果删除的是当前会话，切换到列表中第一个，或新建
    if (get().activeSessionId === null) {
      const remaining = get().sessions;
      if (remaining.length > 0) {
        const target = remaining[0];
        set({
          activeSessionId: target.id,
          messages: get().messagesMap[target.id] ?? [],
        });
        saveActiveSessionId(target.id);
        get().connect(WS_URL, target.id);
      } else {
        const newSession = await get().createSession();
        set({ activeSessionId: newSession.id, messages: [] });
        saveActiveSessionId(newSession.id);
        get().connect(WS_URL, newSession.id);
      }
    }
  },

  async renameSession(id: string, name: string) {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    set((s) => ({
      sessions: s.sessions.map((sess) =>
        sess.id === id ? { ...sess, name } : sess
      ),
    }));
  },

  switchSession(id: string) {
    if (get().activeSessionId === id) return;

    set((s) => {
      const flushed = flushMessages(s);
      const restored = flushed.messagesMap[id] ?? [];
      return {
        activeSessionId: id,
        messages: restored,
        isRunning: false,
        messagesMap: flushed.messagesMap,
      };
    });
    saveActiveSessionId(id);
    get().connect(WS_URL, id);
  },

  // ── 服务器消息处理 ──

  _onServerMessage(msg: ServerMessage) {
    const { messages } = get();

    switch (msg.type) {
      case "connected":
        // 新建场景：服务端返回 sessionId，此时 activeSessionId 还没设
        if (!get().activeSessionId && msg.sessionId) {
          set({ activeSessionId: msg.sessionId });
          _lastSessionId = msg.sessionId;
          saveActiveSessionId(msg.sessionId);
          get().fetchSessions();
        }
        break;

      case "chat_delta": {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + msg.delta,
          };
        }
        set((s) => {
          const flushed = flushMessages({ ...s, messages: updated });
          return { messages: updated, messagesMap: flushed.messagesMap };
        });
        break;
      }

      case "chat_done": {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { ...last, status: "done" };
        }
        set((s) => {
          const flushed = flushMessages({ ...s, messages: updated });
          return {
            messages: updated,
            messagesMap: flushed.messagesMap,
            isRunning: false,
          };
        });
        break;
      }

      case "chat_error": {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && last.status === "streaming") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + `\n\n❌ Error: ${msg.error}`,
            status: "done",
          };
        }
        set((s) => {
          const flushed = flushMessages({ ...s, messages: updated });
          return {
            messages: updated,
            messagesMap: flushed.messagesMap,
            isRunning: false,
          };
        });
        break;
      }

      case "session_error": {
        console.error("Session error:", msg.error);
        break;
      }

      case "agent_start":
        set({ isRunning: true });
        break;

      case "agent_end":
        break;

      case "tool_start": {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          const toolCalls = [...(last.toolCalls ?? [])];
          toolCalls.push({
            toolName: msg.toolName,
            status: "running",
          });
          updated[updated.length - 1] = { ...last, toolCalls };
        }
        set((s) => {
          const flushed = flushMessages({ ...s, messages: updated });
          return { messages: updated, messagesMap: flushed.messagesMap };
        });
        break;
      }

      case "tool_update": {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && last.toolCalls) {
          const toolCalls = [...last.toolCalls];
          const runningIdx = toolCalls.findIndex((tc) => tc.status === "running");
          if (runningIdx !== -1) {
            toolCalls[runningIdx] = {
              ...toolCalls[runningIdx],
              output: (toolCalls[runningIdx].output ?? "") + (msg as any).output,
            };
          }
          updated[updated.length - 1] = { ...last, toolCalls };
        }
        set((s) => {
          const flushed = flushMessages({ ...s, messages: updated });
          return { messages: updated, messagesMap: flushed.messagesMap };
        });
        break;
      }

      case "tool_end": {
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant" && last.toolCalls) {
          const toolCalls = [...last.toolCalls];
          const runningIdx = toolCalls.findIndex((tc) => tc.status === "running");
          if (runningIdx !== -1) {
            toolCalls[runningIdx] = {
              ...toolCalls[runningIdx],
              result: msg.result,
              status: "done",
            };
          }
          updated[updated.length - 1] = { ...last, toolCalls };
        }
        set((s) => {
          const flushed = flushMessages({ ...s, messages: updated });
          return { messages: updated, messagesMap: flushed.messagesMap };
        });
        break;
      }
    }
  },
}));

// ── 重连调度 ──

function scheduleReconnect() {
  const { delay, attemptCount } = getNextRetryDelay(_reconnectState);
  _reconnectState = { attemptCount };

  _reconnectTimer = setTimeout(() => {
    _reconnectTimer = null;
    // 使用保存的 URL 和 sessionId 重连
    useChatStore.getState().connect(_lastConnectUrl, _lastSessionId);
  }, delay);
}
