import { create } from "zustand";

// ── 用户配置类型 ──

export interface UserConfig {
  provider: string;
  model: string;
  baseUrl: string;
  apiKey: string;
}

// ── 状态 ──

export interface ConfigState extends UserConfig {
  /** 更新配置并持久化到 localStorage */
  updateConfig: (config: UserConfig) => void;
  /** 从 localStorage 加载配置（页面初始化时调用） */
  loadFromStorage: () => void;
  /** 获取用于 WebSocket 发送的 config 消息 */
  getConfigMessage: () => {
    type: "config";
    provider: string;
    model: string;
    baseUrl: string;
    apiKey: string;
  };
}

const LS_KEY = "pi-chat:config";

function loadFromStorageRaw(): Partial<UserConfig> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveToStorage(config: UserConfig) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
  } catch {
    // localStorage 不可用时静默失败
  }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  provider: "",
  model: "",
  baseUrl: "",
  apiKey: "",

  updateConfig(config: UserConfig) {
    set(config);
    saveToStorage(config);
  },

  loadFromStorage() {
    const stored = loadFromStorageRaw();
    if (Object.keys(stored).length > 0) {
      set({
        provider: stored.provider ?? "",
        model: stored.model ?? "",
        baseUrl: stored.baseUrl ?? "",
        apiKey: stored.apiKey ?? "",
      });
    }
  },

  getConfigMessage() {
    const { provider, model, baseUrl, apiKey } = get();
    return { type: "config" as const, provider, model, baseUrl, apiKey };
  },
}));

// 模块加载时自动从 localStorage 恢复
useConfigStore.getState().loadFromStorage();
