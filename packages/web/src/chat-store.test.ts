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

describe("chat-store 工具调用展示", () => {
  beforeEach(async () => {
    useChatStore.setState({
      connected: false,
      isRunning: false,
      messages: [],
      messagesMap: {},
      ws: null,
      sessions: [],
      activeSessionId: null,
    });

    const url = "ws://localhost:8080";
    useChatStore.getState().connect(url);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;
    ws.simulateMessage({ type: "connected", sessionId: "tool-test-session" });
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it("收到 tool_start 时在最后一条 assistant 消息中添加工具调用信息", async () => {
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;

    useChatStore.getState().sendPrompt("搜索天气");
    await new Promise((resolve) => setTimeout(resolve, 10));

    ws.simulateMessage({ type: "agent_start" });
    ws.simulateMessage({ type: "tool_start", toolName: "tavily_search" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const msgs = useChatStore.getState().messages;
    const lastMsg = msgs[msgs.length - 1] as any;
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.toolCalls).toBeDefined();
    expect(lastMsg.toolCalls.length).toBe(1);
    expect(lastMsg.toolCalls[0].toolName).toBe("tavily_search");
    expect(lastMsg.toolCalls[0].status).toBe("running");
  });

  it("收到 tool_update 时更新工具调用的部分输出", async () => {
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;

    useChatStore.getState().sendPrompt("搜索天气");
    await new Promise((resolve) => setTimeout(resolve, 10));

    ws.simulateMessage({ type: "agent_start" });
    ws.simulateMessage({ type: "tool_start", toolName: "tavily_search" });
    ws.simulateMessage({ type: "tool_update", output: "搜索中..." });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const msgs = useChatStore.getState().messages;
    const lastMsg = msgs[msgs.length - 1] as any;
    expect(lastMsg.toolCalls[0].output).toBe("搜索中...");
  });

  it("收到 tool_end 时更新工具调用的结果和完成状态", async () => {
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;

    useChatStore.getState().sendPrompt("搜索天气");
    await new Promise((resolve) => setTimeout(resolve, 10));

    ws.simulateMessage({ type: "agent_start" });
    ws.simulateMessage({ type: "tool_start", toolName: "tavily_search" });
    ws.simulateMessage({ type: "tool_end", result: "北京今天 25°C 晴" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const msgs = useChatStore.getState().messages;
    const lastMsg = msgs[msgs.length - 1] as any;
    expect(lastMsg.toolCalls[0].result).toBe("北京今天 25°C 晴");
    expect(lastMsg.toolCalls[0].status).toBe("done");
  });

  it("多个工具调用按顺序记录", async () => {
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;

    useChatStore.getState().sendPrompt("搜索多个主题");
    await new Promise((resolve) => setTimeout(resolve, 10));

    ws.simulateMessage({ type: "agent_start" });
    ws.simulateMessage({ type: "tool_start", toolName: "read" });
    ws.simulateMessage({ type: "tool_end", result: "文件内容" });
    ws.simulateMessage({ type: "tool_start", toolName: "tavily_search" });
    ws.simulateMessage({ type: "tool_end", result: "搜索结果" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    const msgs = useChatStore.getState().messages;
    const lastMsg = msgs[msgs.length - 1] as any;
    expect(lastMsg.toolCalls.length).toBe(2);
    expect(lastMsg.toolCalls[0].toolName).toBe("read");
    expect(lastMsg.toolCalls[1].toolName).toBe("tavily_search");
  });
});

describe("chat-store 中断回复", () => {
  beforeEach(async () => {
    useChatStore.setState({
      connected: false,
      isRunning: false,
      messages: [],
      messagesMap: {},
      ws: null,
      sessions: [],
      activeSessionId: null,
    });

    const url = "ws://localhost:8080";
    useChatStore.getState().connect(url);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;
    ws.simulateMessage({ type: "connected", sessionId: "abort-test-session" });
    await new Promise((resolve) => setTimeout(resolve, 10));
  });

  it("中断后已生成的文本正常展示并标记为已中断", async () => {
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;

    // 用户发送消息
    useChatStore.getState().sendPrompt("测试中断");
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 模拟服务端发送部分内容
    ws.simulateMessage({ type: "agent_start" });
    ws.simulateMessage({ type: "chat_delta", delta: "这是部分" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 验证正在流式输出
    const msgsBeforeAbort = useChatStore.getState().messages;
    const lastMsg = msgsBeforeAbort[msgsBeforeAbort.length - 1];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.content).toBe("这是部分");
    expect(lastMsg.status).toBe("streaming");
    expect(useChatStore.getState().isRunning).toBe(true);

    // 用户点击中断
    useChatStore.getState().sendAbort();
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 验证中断后的状态
    const msgsAfterAbort = useChatStore.getState().messages;
    const abortedMsg = msgsAfterAbort[msgsAfterAbort.length - 1];
    expect(abortedMsg.content).toBe("这是部分");
    expect(abortedMsg.status).toBe("aborted");
    expect(useChatStore.getState().isRunning).toBe(false);
  });

  it("中断消息通过 WebSocket 发送 abort 类型", async () => {
    const ws = useChatStore.getState().ws as unknown as MockWebSocket;

    useChatStore.getState().sendPrompt("测试");
    await new Promise((resolve) => setTimeout(resolve, 10));

    ws.simulateMessage({ type: "agent_start" });
    await new Promise((resolve) => setTimeout(resolve, 10));

    useChatStore.getState().sendAbort();
    await new Promise((resolve) => setTimeout(resolve, 10));

    const abortMsg = ws.sentMessages
      .map((raw) => JSON.parse(raw))
      .find((msg) => msg.type === "abort");
    expect(abortMsg).toBeDefined();
  });
});

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
