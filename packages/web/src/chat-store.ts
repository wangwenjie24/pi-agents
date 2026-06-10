import { create } from "zustand";
import type { ServerMessage, ClientMessage } from "@pi-chat/shared";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "streaming" | "done";
}

export interface ChatState {
  connected: boolean;
  isRunning: boolean;
  messages: ChatMessage[];
  ws: WebSocket | null;

  connect: (url: string) => void;
  disconnect: () => void;
  sendPrompt: (text: string) => void;
  sendAbort: () => void;
  _onServerMessage: (msg: ServerMessage) => void;
}

let nextId = 1;

export const useChatStore = create<ChatState>((set, get) => ({
  connected: false,
  isRunning: false,
  messages: [],
  ws: null,

  connect(url: string) {
    const ws = new WebSocket(url);

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

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `msg-${nextId++}`,
      role: "user",
      content: text,
      status: "done",
    };

    // 添加空的助手消息（等待流式填充）
    const assistantMsg: ChatMessage = {
      id: `msg-${nextId++}`,
      role: "assistant",
      content: "",
      status: "streaming",
    };

    set({
      messages: [...messages, userMsg, assistantMsg],
      isRunning: true,
    });

    const clientMsg: ClientMessage = { type: "prompt", text };
    ws.send(JSON.stringify(clientMsg));
  },

  sendAbort() {
    const { ws } = get();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: "abort" }));
  },

  _onServerMessage(msg: ServerMessage) {
    const { messages } = get();

    switch (msg.type) {
      case "connected":
        // 连接已确认
        break;

      case "chat_delta": {
        // 追加 delta 到最后一条助手消息
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + msg.delta,
          };
        }
        set({ messages: updated });
        break;
      }

      case "chat_done": {
        // 标记最后一条助手消息为 done
        const updated = [...messages];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { ...last, status: "done" };
        }
        set({ messages: updated, isRunning: false });
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
        set({ messages: updated, isRunning: false });
        break;
      }

      case "agent_start":
        set({ isRunning: true });
        break;

      case "agent_end":
        // agent_end 后面通常跟着 chat_done
        break;

      case "tool_start":
      case "tool_update":
      case "tool_end":
        // TODO: 在 UI 中展示工具调用信息
        break;
    }
  },
}));
