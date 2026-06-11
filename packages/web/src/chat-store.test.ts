import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

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

// ── Mock WebSocket ──

/** 记录所有创建的 WebSocket 实例，便于测试中获取 */
let mockWsInstances: MockWebSocket[] = [];

class MockWebSocket {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;
  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((ev?: { code?: number; reason?: string }) => void) | null = null;
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

  /** 模拟连接成功 */
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  /** 模拟连接关闭 */
  simulateClose(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({ code, reason });
  }

  /** 模拟连接错误 */
  simulateError() {
    this.onerror?.();
  }

  /** 模拟服务端发来消息 */
  simulateMessage(data: any) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }
}

(globalThis as any).WebSocket = MockWebSocket;

// Mock fetch（chat-store 的 fetchSessions 需要）
(globalThis as any).fetch = async () => ({
  json: async () => [],
});

// Mock setTimeout / clearTimeout 以便测试重连定时器
const mockTimers = {
  pending: new Map<number, () => void>(),
  nextId: 1,
};

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

// 只 mock chat-store 内部用到的重连定时器
// 我们用 vi.useFakeTimers() 来控制
let clock: ReturnType<typeof vi.useFakeTimers>;

const { useChatStore } = await import("./chat-store.js");

/** 获取最新的 WebSocket 实例 */
function latestWs(): MockWebSocket {
  if (mockWsInstances.length === 0) throw new Error("没有 WebSocket 实例");
  return mockWsInstances[mockWsInstances.length - 1];
}

/** 重置所有状态 */
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

// ── 测试组 ──

describe("chat-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("WebSocket 连接时发送 config", () => {
    it("WebSocket 连接成功后自动发送 config 消息", async () => {
      const url = "ws://localhost:8080";
      useChatStore.getState().connect(url);

      const ws = latestWs();
      ws.simulateOpen();

      // 模拟服务端返回 connected 消息
      ws.simulateMessage({ type: "connected", sessionId: "test-session-1" });

      // 验证发送了 config 消息
      const configMsg = ws.sentMessages
        .map((raw) => JSON.parse(raw))
        .find((msg) => msg.type === "config");

      expect(configMsg).toBeDefined();
      expect(configMsg.provider).toBe("openai");
      expect(configMsg.model).toBe("gpt-4o");
    });
  });

  describe("连接状态（connectionStatus）", () => {
    it("初始状态为 disconnected", () => {
      expect(useChatStore.getState().connectionStatus).toBe("disconnected");
    });

    it("连接成功后状态变为 connected", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      expect(useChatStore.getState().connectionStatus).toBe("connecting");

      latestWs().simulateOpen();
      expect(useChatStore.getState().connectionStatus).toBe("connected");
    });

    it("连接断开后状态变为 reconnecting", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      expect(useChatStore.getState().connectionStatus).toBe("connected");

      latestWs().simulateClose();
      expect(useChatStore.getState().connectionStatus).toBe("reconnecting");
    });

    it("主动 disconnect 后状态为 disconnected（不触发重连）", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();

      useChatStore.getState().disconnect();
      expect(useChatStore.getState().connectionStatus).toBe("disconnected");

      // 推进时间，不应创建新连接
      vi.advanceTimersByTime(60000);
      expect(mockWsInstances.length).toBe(1);
    });
  });

  describe("自动重连", () => {
    it("断开后自动尝试重连（指数退避）", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      const ws1 = latestWs();
      ws1.simulateOpen();

      // 模拟断开
      ws1.simulateClose();
      expect(useChatStore.getState().connectionStatus).toBe("reconnecting");

      // 第一次重连在 1s 后
      vi.advanceTimersByTime(999);
      expect(mockWsInstances.length).toBe(1); // 还没重连

      vi.advanceTimersByTime(1);
      expect(mockWsInstances.length).toBe(2); // 发起第一次重连
    });

    it("重连成功后状态恢复为 connected", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateClose();

      // 触发第一次重连
      vi.advanceTimersByTime(1000);

      const ws2 = latestWs();
      ws2.simulateOpen();

      expect(useChatStore.getState().connectionStatus).toBe("connected");
    });

    it("重连失败时继续指数退避", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateClose();

      // 第一次重连（1s 后）
      vi.advanceTimersByTime(1000);
      expect(mockWsInstances.length).toBe(2);
      latestWs().simulateClose(); // 重连也失败

      // 第二次重连（2s 后）
      vi.advanceTimersByTime(1999);
      expect(mockWsInstances.length).toBe(2);
      vi.advanceTimersByTime(1);
      expect(mockWsInstances.length).toBe(3);
      latestWs().simulateClose();

      // 第三次重连（4s 后）
      vi.advanceTimersByTime(3999);
      expect(mockWsInstances.length).toBe(3);
      vi.advanceTimersByTime(1);
      expect(mockWsInstances.length).toBe(4);
    });
  });

  describe("重连后恢复", () => {
    it("重连成功后重新发送 config", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateClose();

      // 触发重连并成功
      vi.advanceTimersByTime(1000);
      const ws2 = latestWs();
      ws2.simulateOpen();

      // 验证第二个连接也发送了 config
      const configMsg = ws2.sentMessages
        .map((raw) => JSON.parse(raw))
        .find((msg) => msg.type === "config");

      expect(configMsg).toBeDefined();
      expect(configMsg.provider).toBe("openai");
    });

    it("重连成功后恢复当前会话的 sessionId", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "session-abc" });

      expect(useChatStore.getState().activeSessionId).toBe("session-abc");

      latestWs().simulateClose();

      // 触发重连
      vi.advanceTimersByTime(1000);
      const ws2 = latestWs();
      ws2.simulateOpen();

      // 重连 URL 应包含原 sessionId
      expect(ws2.url).toContain("sessionId=session-abc");
    });
  });

  describe("消息缓冲", () => {
    it("断连期间发送的消息被缓冲", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "s1" });

      // 断开连接
      latestWs().simulateClose();
      expect(useChatStore.getState().connectionStatus).toBe("reconnecting");

      // 尝试发送消息（应被缓冲）
      useChatStore.getState().sendPrompt("第一条离线消息");
      useChatStore.getState().sendPrompt("第二条离线消息");

      expect(useChatStore.getState().pendingMessages).toEqual([
        "第一条离线消息",
        "第二条离线消息",
      ]);
    });

    it("重连成功后缓冲消息被依次发送", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "s1" });

      latestWs().simulateClose();

      // 缓冲两条消息
      useChatStore.getState().sendPrompt("消息A");
      useChatStore.getState().sendPrompt("消息B");

      // 重连
      vi.advanceTimersByTime(1000);
      const ws2 = latestWs();
      ws2.simulateOpen();

      // 验证缓冲消息被发送
      const prompts = ws2.sentMessages
        .map((raw) => JSON.parse(raw))
        .filter((msg) => msg.type === "prompt");

      expect(prompts).toEqual([
        { type: "prompt", text: "消息A" },
        { type: "prompt", text: "消息B" },
      ]);

      // 缓冲已清空
      expect(useChatStore.getState().pendingMessages).toEqual([]);
    });
  });
});
