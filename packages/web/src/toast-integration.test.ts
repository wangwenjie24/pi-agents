import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * 切片 3 测试：Toast 通知集成
 *
 * 行为：
 * - chat-store 收到 session_error 时触发 toast.error
 * - toast 包含错误信息
 */

// Mock localStorage
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() {
    return store.size;
  },
  key: (_index: number) => null,
};
(globalThis as any).localStorage = localStorageMock;

store.set(
  "pi-chat:config",
  JSON.stringify({
    provider: "openai",
    model: "gpt-4o",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "sk-test-123",
  })
);

// Mock sonner toast
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
  Toaster: () => null,
}));

// Mock WebSocket
let mockWsInstances: any[] = [];

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((ev?: any) => void) | null = null;
  onerror: ((ev?: any) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  sentMessages: string[] = [];
  constructor(public url: string) {
    mockWsInstances.push(this);
  }
  send(data: string) {
    this.sentMessages.push(data);
  }
  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }
  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

(globalThis as any).WebSocket = MockWebSocket;
(globalThis as any).fetch = async () => ({ json: async () => [] });

const { useConfigStore } = await import("./config-store.js");
useConfigStore.getState().loadFromStorage();
const { useChatStore } = await import("./chat-store.js");

function latestWs() {
  return mockWsInstances[mockWsInstances.length - 1];
}

function resetAll() {
  mockWsInstances = [];
  useChatStore.setState({
    connected: false,
    isRunning: false,
    messages: [],
    messagesMap: {},
    ws: null,
    sessions: [],
    activeSessionId: null,
    connectionStatus: "disconnected" as const,
    pendingMessages: [],
  });
}

describe("Toast 通知", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAll();
    mockToastError.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("收到 session_error 时调用 toast.error 显示错误信息", () => {
    useChatStore.getState().connect("ws://localhost:8080");
    latestWs().simulateOpen();
    latestWs().simulateMessage({ type: "connected", sessionId: "s1" });

    latestWs().simulateMessage({
      type: "session_error",
      error: "会话已过期",
    });

    expect(mockToastError).toHaveBeenCalledWith("会话已过期");
  });

  it("收到 chat_error 时调用 toast.error 显示错误信息", () => {
    useChatStore.getState().connect("ws://localhost:8080");
    latestWs().simulateOpen();
    latestWs().simulateMessage({ type: "connected", sessionId: "s1" });

    useChatStore.getState().sendPrompt("测试");
    latestWs().simulateMessage({ type: "agent_start" });
    latestWs().simulateMessage({
      type: "chat_error",
      error: "模型调用失败",
    });

    expect(mockToastError).toHaveBeenCalledWith("模型调用失败");
  });
});
