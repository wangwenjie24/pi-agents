import { create } from "zustand";
import type { ServerMessage, ClientMessage } from "@pi-chat/shared";

// ── 类型定义 ──

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done";
}

export interface Session {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// ── 状态 ──

export interface ChatState {
  // WebSocket
  connected: boolean;
  isRunning: boolean;
  ws: WebSocket | null;

  // 消息（当前活动会话的）
  messages: ChatMessage[];
  // 按 sessionId 隔离的消息缓存
  messagesMap: Record<string, ChatMessage[]>;

  // 会话管理
  sessions: Session[];
  activeSessionId: string | null;

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
  isRunning: false,
  messages: [],
  messagesMap: {},
  ws: null,
  sessions: [],
  activeSessionId: null,

  // ── WebSocket ──

  connect(url: string, sessionId?: string) {
    // 先断开旧连接
    get().ws?.close();

    const wsUrl = sessionId ? `${url}?sessionId=${sessionId}` : url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => set({ connected: true, ws });
    ws.onclose = () => set({ connected: false, ws: null });
    ws.onerror = () => set({ connected: false });

    ws.onmessage = (e) => {
      try {
        const msg: ServerMessage = JSON.parse(e.data);
        get()._onServerMessage(msg);
      } catch {
        // ignore invalid messages
      }
    };

    set({ ws });
  },

  disconnect() {
    get().ws?.close();
    set({ ws: null, connected: false });
  },

  sendPrompt(text: string) {
    const { ws, messages } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

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

    const next = [...messages, userMsg, assistantMsg];

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

      case "tool_start":
      case "tool_update":
      case "tool_end":
        // TODO: 在 UI 中展示工具调用信息
        break;
    }
  },
}));
