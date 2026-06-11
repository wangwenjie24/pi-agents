import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

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

// Mock document.documentElement
const classListMock = {
  _classes: new Set<string>(),
  add(cls: string) {
    this._classes.add(cls);
  },
  remove(cls: string) {
    this._classes.delete(cls);
  },
  contains(cls: string) {
    return this._classes.has(cls);
  },
};

(globalThis as any).document = {
  documentElement: {
    classList: classListMock,
  },
};

const { useThemeStore } = await import("./theme-store.js");

describe("theme-store", () => {
  beforeEach(() => {
    store.clear();
    classListMock._classes.clear();
    useThemeStore.setState({ theme: "light" });
  });

  it("初始状态为 light", () => {
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("toggle 从 light 切换到 dark", () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("dark");
  });

  it("toggle 从 dark 切换到 light", () => {
    useThemeStore.setState({ theme: "dark" });
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("切换到 dark 时为 html 添加 .dark class", () => {
    useThemeStore.getState().toggle();
    expect(classListMock.contains("dark")).toBe(true);
  });

  it("切换回 light 时移除 .dark class", () => {
    useThemeStore.setState({ theme: "dark" });
    classListMock._classes.add("dark");
    useThemeStore.getState().toggle();
    expect(classListMock.contains("dark")).toBe(false);
  });

  it("主题切换后持久化到 localStorage", () => {
    useThemeStore.getState().toggle();
    expect(store.get("pi-chat:theme")).toBe("dark");
  });

  it("initFromStorage 从 localStorage 恢复 dark 主题", () => {
    store.set("pi-chat:theme", "dark");
    useThemeStore.getState().initFromStorage();
    expect(useThemeStore.getState().theme).toBe("dark");
    expect(classListMock.contains("dark")).toBe(true);
  });

  it("initFromStorage 从 localStorage 恢复 light 主题", () => {
    store.set("pi-chat:theme", "light");
    useThemeStore.getState().initFromStorage();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(classListMock.contains("dark")).toBe(false);
  });

  it("initFromStorage 在无 localStorage 数据时默认 light", () => {
    useThemeStore.getState().initFromStorage();
    expect(useThemeStore.getState().theme).toBe("light");
    expect(classListMock.contains("dark")).toBe(false);
  });
});
