import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock localStorage
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (_index: number) => null,
};
(globalThis as any).localStorage = localStorageMock;

// 预设 config 数据到 localStorage
store.set("pi-chat:config", JSON.stringify({
  provider: "openai",
  model: "gpt-4o",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "sk-test-123",
}));

// 动态导入以使 mock 生效
const { useConfigStore } = await import("./config-store.js");

// 先让 config-store 初始化读取 localStorage
useConfigStore.getState().loadFromStorage();

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;
  onopen: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  sentMessages: string[] = [];

  constructor(public url: string) {
    // 异步触发 onopen，模拟真实 WebSocket
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // 模拟服务端发来消息
  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

(globalThis as any).WebSocket = MockWebSocket;

// Mock fetch（chat-store 的 fetchSessions 需要）
(globalThis as any).fetch = async () => ({
  json: async () => [],
});

const { useChatStore } = await import("./chat-store.js");

describe("chat-store WebSocket 连接时发送 config", () => {
  beforeEach(() => {
    // 重置 chat-store 状态
    useChatStore.setState({
      connected: false,
      isRunning: false,
      messages: [],
      messagesMap: {},
      ws: null,
      sessions: [],
      activeSessionId: null,
    });
  });

  it("WebSocket 连接成功后自动发送 config 消息", async () => {
    const url = "ws://localhost:8080";
    useChatStore.getState().connect(url);

    // 等待 onopen 触发
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 获取 MockWebSocket 实例
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;
    expect(ws).toBeDefined();

    // 模拟服务端返回 connected 消息
    ws.simulateMessage({ type: "connected", sessionId: "test-session-1" });

    // 等待消息处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 验证发送了 config 消息
    const configMsg = ws.sentMessages
      .map((raw) => JSON.parse(raw))
      .find((msg) => msg.type === "config");

    expect(configMsg).toBeDefined();
    expect(configMsg.provider).toBe("openai");
    expect(configMsg.model).toBe("gpt-4o");
    expect(configMsg.baseUrl).toBe("https://api.openai.com/v1");
    expect(configMsg.apiKey).toBe("sk-test-123");
  });
});
