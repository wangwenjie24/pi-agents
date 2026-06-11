import { describe, it, expect, beforeEach } from "vitest";

// config-store 使用 localStorage，测试中用 Map 模拟
const store = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (_index: number) => null,
};

// 在模块加载前注入 localStorage mock
(globalThis as any).localStorage = localStorageMock;

// 动态导入以便 mock 生效
const { useConfigStore } = await import("./config-store.js");

describe("config-store", () => {
  beforeEach(() => {
    store.clear();
    // 重置 zustand store 状态
    useConfigStore.setState({
      provider: "",
      model: "",
      baseUrl: "",
      apiKey: "",
    });
  });

  it("默认值为空字符串", () => {
    const state = useConfigStore.getState();
    expect(state.provider).toBe("");
    expect(state.model).toBe("");
    expect(state.baseUrl).toBe("");
    expect(state.apiKey).toBe("");
  });

  it("updateConfig 更新配置并持久化到 localStorage", () => {
    useConfigStore.getState().updateConfig({
      provider: "openai",
      model: "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test-123",
    });

    const state = useConfigStore.getState();
    expect(state.provider).toBe("openai");
    expect(state.model).toBe("gpt-4o");
    expect(state.baseUrl).toBe("https://api.openai.com/v1");
    expect(state.apiKey).toBe("sk-test-123");

    // 验证持久化
    const stored = store.get("pi-chat:config");
    expect(stored).toBeDefined();
    const parsed = JSON.parse(stored!);
    expect(parsed.provider).toBe("openai");
  });

  it("页面加载时从 localStorage 恢复配置", () => {
    // 预设 localStorage 数据
    store.set("pi-chat:config", JSON.stringify({
      provider: "anthropic",
      model: "claude-sonnet-4",
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant-456",
    }));

    // 重新触发初始化逻辑
    useConfigStore.getState().loadFromStorage();

    const state = useConfigStore.getState();
    expect(state.provider).toBe("anthropic");
    expect(state.model).toBe("claude-sonnet-4");
    expect(state.baseUrl).toBe("https://api.anthropic.com");
    expect(state.apiKey).toBe("sk-ant-456");
  });

  it("getConfigMessage 返回正确格式的 config 消息", () => {
    useConfigStore.getState().updateConfig({
      provider: "openai",
      model: "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
    });

    const msg = useConfigStore.getState().getConfigMessage();
    expect(msg).toEqual({
      type: "config",
      provider: "openai",
      model: "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test",
    });
  });
});
