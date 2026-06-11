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

const { useChatStore } = await import("./chat-store.js");

// ── 测试组 ──

describe("chat-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("工具调用展示", () => {
    beforeEach(() => {
      resetAll();
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "tool-test-session" });
    });

    it("收到 tool_start 时在最后一条 assistant 消息中添加工具调用信息", () => {
      useChatStore.getState().sendPrompt("搜索天气");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "tool_start", toolName: "tavily_search" });

      const msgs = useChatStore.getState().messages;
      const lastMsg = msgs[msgs.length - 1] as any;
      expect(lastMsg.role).toBe("assistant");
      expect(lastMsg.toolCalls).toBeDefined();
      expect(lastMsg.toolCalls.length).toBe(1);
      expect(lastMsg.toolCalls[0].toolName).toBe("tavily_search");
      expect(lastMsg.toolCalls[0].status).toBe("running");
    });

    it("收到 tool_update 时更新工具调用的部分输出", () => {
      useChatStore.getState().sendPrompt("搜索天气");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "tool_start", toolName: "tavily_search" });
      latestWs().simulateMessage({ type: "tool_update", output: "搜索中..." });

      const msgs = useChatStore.getState().messages;
      const lastMsg = msgs[msgs.length - 1] as any;
      expect(lastMsg.toolCalls[0].output).toBe("搜索中...");
    });

    it("收到 tool_end 时更新工具调用的结果和完成状态", () => {
      useChatStore.getState().sendPrompt("搜索天气");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "tool_start", toolName: "tavily_search" });
      latestWs().simulateMessage({ type: "tool_end", result: "北京今天 25°C 晴" });

      const msgs = useChatStore.getState().messages;
      const lastMsg = msgs[msgs.length - 1] as any;
      expect(lastMsg.toolCalls[0].result).toBe("北京今天 25°C 晴");
      expect(lastMsg.toolCalls[0].status).toBe("done");
    });

    it("多个工具调用按顺序记录", () => {
      useChatStore.getState().sendPrompt("搜索多个主题");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "tool_start", toolName: "read" });
      latestWs().simulateMessage({ type: "tool_end", result: "文件内容" });
      latestWs().simulateMessage({ type: "tool_start", toolName: "tavily_search" });
      latestWs().simulateMessage({ type: "tool_end", result: "搜索结果" });

      const msgs = useChatStore.getState().messages;
      const lastMsg = msgs[msgs.length - 1] as any;
      expect(lastMsg.toolCalls.length).toBe(2);
      expect(lastMsg.toolCalls[0].toolName).toBe("read");
      expect(lastMsg.toolCalls[1].toolName).toBe("tavily_search");
    });
  });

  describe("中断回复", () => {
    beforeEach(() => {
      resetAll();
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "abort-test-session" });
    });

    it("中断后已生成的文本正常展示并标记为已中断", () => {
      useChatStore.getState().sendPrompt("测试中断");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "chat_delta", delta: "这是部分" });

      // 验证正在流式输出
      const msgsBeforeAbort = useChatStore.getState().messages;
      const lastMsg = msgsBeforeAbort[msgsBeforeAbort.length - 1];
      expect(lastMsg.role).toBe("assistant");
      expect(lastMsg.content).toBe("这是部分");
      expect(lastMsg.status).toBe("streaming");
      expect(useChatStore.getState().isRunning).toBe(true);

      // 用户点击中断
      useChatStore.getState().sendAbort();

      // 验证中断后的状态
      const msgsAfterAbort = useChatStore.getState().messages;
      const abortedMsg = msgsAfterAbort[msgsAfterAbort.length - 1];
      expect(abortedMsg.content).toBe("这是部分");
      expect(abortedMsg.status).toBe("aborted");
      expect(useChatStore.getState().isRunning).toBe(false);
    });

    it("中断消息通过 WebSocket 发送 abort 类型", () => {
      useChatStore.getState().sendPrompt("测试");

      latestWs().simulateMessage({ type: "agent_start" });

      useChatStore.getState().sendAbort();

      const abortMsg = latestWs().sentMessages
        .map((raw) => JSON.parse(raw))
        .find((msg) => msg.type === "abort");
      expect(abortMsg).toBeDefined();
    });
  });

  describe("WebSocket 连接时发送 config", () => {
    it("WebSocket 连接成功后自动发送 config 消息", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();

      // 验证发送了 config 消息
      const configMsg = latestWs().sentMessages
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
      latestWs().simulateOpen();

      latestWs().simulateClose();
      expect(useChatStore.getState().connectionStatus).toBe("reconnecting");

      // 第一次重连在 1s 后
      vi.advanceTimersByTime(999);
      expect(mockWsInstances.length).toBe(1);

      vi.advanceTimersByTime(1);
      expect(mockWsInstances.length).toBe(2);
    });

    it("重连成功后状态恢复为 connected", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateClose();

      vi.advanceTimersByTime(1000);

      latestWs().simulateOpen();
      expect(useChatStore.getState().connectionStatus).toBe("connected");
    });

    it("重连失败时继续指数退避", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateClose();

      // 第一次重连（1s 后）
      vi.advanceTimersByTime(1000);
      expect(mockWsInstances.length).toBe(2);
      latestWs().simulateClose();

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

      vi.advanceTimersByTime(1000);
      latestWs().simulateOpen();

      const configMsg = latestWs().sentMessages
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

      vi.advanceTimersByTime(1000);
      const ws2 = latestWs();
      ws2.simulateOpen();

      expect(ws2.url).toContain("sessionId=session-abc");
    });
  });

  describe("消息缓冲", () => {
    it("断连期间发送的消息被缓冲", () => {
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "s1" });

      latestWs().simulateClose();
      expect(useChatStore.getState().connectionStatus).toBe("reconnecting");

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

      useChatStore.getState().sendPrompt("消息A");
      useChatStore.getState().sendPrompt("消息B");

      vi.advanceTimersByTime(1000);
      const ws2 = latestWs();
      ws2.simulateOpen();

      const prompts = ws2.sentMessages
        .map((raw) => JSON.parse(raw))
        .filter((msg) => msg.type === "prompt");

      expect(prompts).toEqual([
        { type: "prompt", text: "消息A" },
        { type: "prompt", text: "消息B" },
      ]);

      expect(useChatStore.getState().pendingMessages).toEqual([]);
    });
  });

  describe("编辑消息并重发", () => {
    beforeEach(() => {
      resetAll();
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "edit-test-session" });
    });

    it("editMessage 更新用户消息内容并标记为已编辑", () => {
      useChatStore.getState().sendPrompt("原始消息");

      // 模拟 AI 回复完成
      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "chat_delta", delta: "回复" });
      latestWs().simulateMessage({ type: "chat_done" });

      // 找到用户消息的 id
      const msgs = useChatStore.getState().messages;
      const userMsg = msgs.find((m) => m.role === "user")!;

      useChatStore.getState().editMessage(userMsg.id, "编辑后的消息");

      const updated = useChatStore.getState().messages;
      const editedUserMsg = updated.find((m) => m.id === userMsg.id)!;
      expect(editedUserMsg.content).toBe("编辑后的消息");
      expect((editedUserMsg as any).edited).toBe(true);
    });

    it("editMessage 移除编辑消息之后的 AI 回复", () => {
      useChatStore.getState().sendPrompt("原始消息");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "chat_delta", delta: "AI 回复" });
      latestWs().simulateMessage({ type: "chat_done" });

      const msgs = useChatStore.getState().messages;
      expect(msgs.length).toBe(2); // user + assistant

      const userMsg = msgs.find((m) => m.role === "user")!;
      useChatStore.getState().editMessage(userMsg.id, "编辑后");

      const updated = useChatStore.getState().messages;
      expect(updated.length).toBe(2); // 用户消息 + 新的空 assistant 消息
      expect(updated[0].content).toBe("编辑后");
      expect(updated[1].role).toBe("assistant");
      expect(updated[1].status).toBe("streaming");
    });

    it("editMessage 通过 WebSocket 发送新的 prompt", () => {
      useChatStore.getState().sendPrompt("原始消息");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "chat_done" });

      const msgs = useChatStore.getState().messages;
      const userMsg = msgs.find((m) => m.role === "user")!;

      latestWs().sentMessages.length = 0; // 清空
      useChatStore.getState().editMessage(userMsg.id, "编辑后");

      const promptMsg = latestWs().sentMessages
        .map((raw) => JSON.parse(raw))
        .find((msg) => msg.type === "prompt");
      expect(promptMsg).toBeDefined();
      expect(promptMsg.text).toBe("编辑后");
    });
  });

  describe("重新生成 AI 回复", () => {
    beforeEach(() => {
      resetAll();
      useChatStore.getState().connect("ws://localhost:8080");
      latestWs().simulateOpen();
      latestWs().simulateMessage({ type: "connected", sessionId: "regen-session" });
    });

    it("regenerateMessage 替换 AI 回复为新的空 streaming 消息", () => {
      useChatStore.getState().sendPrompt("你好");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "chat_delta", delta: "你好！" });
      latestWs().simulateMessage({ type: "chat_done" });

      const msgs = useChatStore.getState().messages;
      const aiMsg = msgs.find((m) => m.role === "assistant")!;

      useChatStore.getState().regenerateMessage(aiMsg.id);

      const updated = useChatStore.getState().messages;
      // 应该只有 user + 新 assistant 两条
      expect(updated.length).toBe(2);
      expect(updated[1].role).toBe("assistant");
      expect(updated[1].content).toBe("");
      expect(updated[1].status).toBe("streaming");
      expect(useChatStore.getState().isRunning).toBe(true);
    });

    it("regenerateMessage 通过 WebSocket 发送对应的用户 prompt", () => {
      useChatStore.getState().sendPrompt("重新回答我");

      latestWs().simulateMessage({ type: "agent_start" });
      latestWs().simulateMessage({ type: "chat_done" });

      const msgs = useChatStore.getState().messages;
      const aiMsg = msgs.find((m) => m.role === "assistant")!;

      latestWs().sentMessages.length = 0;
      useChatStore.getState().regenerateMessage(aiMsg.id);

      const promptMsg = latestWs().sentMessages
        .map((raw) => JSON.parse(raw))
        .find((msg) => msg.type === "prompt");
      expect(promptMsg).toBeDefined();
      expect(promptMsg.text).toBe("重新回答我");
    });
  });
});
