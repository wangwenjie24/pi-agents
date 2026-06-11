import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

/**
 * 切片 2 测试：Sidebar 中的主题切换按钮
 *
 * 行为：
 * - Sidebar 底部有主题切换按钮（Sun/Moon 图标）
 * - 当前为 light 模式时显示 Moon 图标（标题提示"切换暗色模式"）
 * - 当前为 dark 模式时显示 Sun 图标（标题提示"切换亮色模式"）
 * - 点击按钮调用 toggle 函数
 */

const mockToggle = vi.fn();

vi.mock("../theme-store.js", () => ({
  useThemeStore: (selector: any) => {
    const state = { theme: currentTheme, toggle: mockToggle };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

let currentTheme = "light";

const mockChatStoreState = {
  sessions: [],
  activeSessionId: null,
  fetchSessions: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn().mockResolvedValue({ id: "new", name: "新会话", createdAt: "", updatedAt: "" }),
  deleteSession: vi.fn(),
  renameSession: vi.fn(),
  switchSession: vi.fn(),
  connect: vi.fn(),
};

const _mockUseChatStore = (selector: any) => {
  return typeof selector === "function" ? selector(mockChatStoreState) : mockChatStoreState;
};
_mockUseChatStore.getState = () => mockChatStoreState;
_mockUseChatStore.setState = () => {};

vi.mock("../chat-store.js", () => ({
  useChatStore: _mockUseChatStore,
}));

const { Sidebar } = await import("./Sidebar.js");

describe("Sidebar 主题切换", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTheme = "light";
  });

  afterEach(() => {
    cleanup();
  });

  it("light 模式下显示 Moon 图标按钮", () => {
    render(<Sidebar />);
    const btn = screen.getByTitle("切换暗色模式");
    expect(btn).toBeInTheDocument();
  });

  it("dark 模式下显示 Sun 图标按钮", () => {
    currentTheme = "dark";
    render(<Sidebar />);
    const btn = screen.getByTitle("切换亮色模式");
    expect(btn).toBeInTheDocument();
  });

  it("点击主题切换按钮调用 toggle", async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    const btn = screen.getByTitle("切换暗色模式");
    await user.click(btn);
    expect(mockToggle).toHaveBeenCalledOnce();
  });
});
