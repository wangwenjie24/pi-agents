import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent, act, waitFor } from "@testing-library/react";
import React from "react";

/**
 * Issue #17 测试：侧边栏会话管理
 *
 * 行为：
 * - 侧边栏 300px 固定宽度，可收起/展开
 * - 收起/展开按钮位于侧边栏顶部
 * - 收起时聊天区自动填满宽度
 * - 会话列表 Ghost 按钮样式，文字 truncate
 * - 会话列表支持创建、切换、删除、重命名
 * - 会话列表加载时显示 Skeleton 占位条
 * - 顶部导航栏显示品牌 Logo + 名称 + 新建对话按钮
 * - 对话未开始时顶部导航隐藏
 * - 移动端（< 1024px）侧边栏以 Sheet 形式从左侧滑入
 * - 三栏 Grid 布局就位，右侧面板可扩展
 */

// ── Mock framer-motion ──
// motion is a proxy that creates passthrough components for any HTML tag
const createMotionMock = () =>
  new Proxy(
    {},
    {
      get(_target, prop: string) {
        return React.forwardRef(
          (
            props: React.PropsWithChildren<Record<string, unknown>>,
            ref: React.Ref<HTMLElement>
          ) => {
            const { children, ...rest } = props;
            const filtered: Record<string, unknown> = {};
            const skip = new Set([
              "initial", "animate", "exit", "transition", "variants",
              "whileHover", "whileTap", "layout", "layoutId",
              "onAnimationStart", "onAnimationComplete", "onDrag",
              "onDragStart", "onDragEnd",
            ]);
            for (const [k, v] of Object.entries(rest)) {
              if (!skip.has(k)) filtered[k] = v;
            }
            return React.createElement(prop, { ...filtered, ref }, children);
          }
        );
      },
    }
  );

vi.mock("framer-motion", () => ({
  motion: createMotionMock(),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// ── Mock @radix-ui/react-dialog ──
vi.mock("@radix-ui/react-dialog", () => {
  const React = require("react");
  return {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) => {
      return React.createElement("div", {
        "data-testid": "sheet-root",
        "data-open": open ? "true" : "false",
      }, children);
    },
    Trigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; [key: string]: unknown }) =>
      React.createElement("div", { ...props, "data-testid": "sheet-trigger" }, children),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Overlay: React.forwardRef((props: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement("div", { ...props, ref, "data-testid": "sheet-overlay" })
    ),
    Content: React.forwardRef((props: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) =>
      React.createElement("div", { ...props, ref, "data-testid": "sheet-content" })
    ),
    Close: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) =>
      React.createElement("div", { ...props, "data-testid": "sheet-close" }, children),
    Title: React.forwardRef((props: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLHeadingElement>) =>
      React.createElement("h2", { ...props, ref })
    ),
    Description: React.forwardRef((props: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLParagraphElement>) =>
      React.createElement("p", { ...props, ref })
    ),
  };
});

// ── Mock stores ──

const mockFetchSessions = vi.fn().mockResolvedValue(undefined);
const mockCreateSession = vi.fn().mockResolvedValue({
  id: "new-1",
  name: "新会话",
  createdAt: "",
  updatedAt: "",
});
const mockDeleteSession = vi.fn().mockResolvedValue(undefined);
const mockRenameSession = vi.fn().mockResolvedValue(undefined);
const mockSwitchSession = vi.fn();
const mockConnect = vi.fn();

let chatStateOverride: Record<string, unknown> = {};

function setChatState(overrides: Record<string, unknown>) {
  chatStateOverride = overrides;
}

const baseChatState = {
  connected: true,
  isRunning: false,
  messages: [
    { id: "m1", role: "user", content: "hello", status: "done" },
  ],
  sessions: [
    { id: "s1", name: "会话一", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
    { id: "s2", name: "会话二", createdAt: "2024-01-02", updatedAt: "2024-01-02" },
  ],
  activeSessionId: "s1",
  connectionStatus: "connected",
  sendPrompt: vi.fn(),
  sendAbort: vi.fn(),
  connect: mockConnect,
  disconnect: vi.fn(),
  fetchSessions: mockFetchSessions,
  createSession: mockCreateSession,
  deleteSession: mockDeleteSession,
  renameSession: mockRenameSession,
  switchSession: mockSwitchSession,
  editMessage: vi.fn(),
  regenerateMessage: vi.fn(),
  messagesMap: {},
  pendingMessages: [],
  ws: null,
  _onServerMessage: vi.fn(),
};

vi.mock("../chat-store.js", () => {
  const getState = () => ({ ...baseChatState, ...chatStateOverride });
  const useChatStore = Object.assign(
    (selector: any) => {
      const state = getState();
      return typeof selector === "function" ? selector(state) : state;
    },
    { getState, setState: () => {}, subscribe: () => () => {} }
  );
  return { useChatStore };
});

vi.mock("../config-store.js", () => ({
  useConfigStore: (selector: any) =>
    typeof selector === "function"
      ? selector({ provider: "openai", model: "gpt-4o" })
      : { provider: "openai", model: "gpt-4o" },
}));

vi.mock("../ChatRuntimeProvider.js", () => ({
  ChatRuntimeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../theme-store.js", () => ({
  useThemeStore: (selector: any) => {
    const state = { theme: "light", toggle: vi.fn(), initFromStorage: vi.fn() };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("../hooks/use-is-mobile.js", () => ({
  useIsMobile: () => false,
}));

const { Sidebar } = await import("./Sidebar.js");

describe("Sidebar 组件 - Issue #17", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-set default mock implementations after clearAllMocks
    mockFetchSessions.mockResolvedValue(undefined);
    mockCreateSession.mockResolvedValue({
      id: "new-1",
      name: "新会话",
      createdAt: "",
      updatedAt: "",
    });
    mockDeleteSession.mockResolvedValue(undefined);
    mockRenameSession.mockResolvedValue(undefined);
    chatStateOverride = {};
  });

  afterEach(() => {
    cleanup();
  });

  // ── Cycle 1: 收起/展开 ──

  describe("侧边栏收起/展开", () => {
    it("侧边栏顶部有收起/展开按钮", async () => {
      render(<Sidebar />);
      // Wait for loading to finish and sessions to render
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });
      const toggleBtn = screen.getByRole("button", {
        name: /收起|折叠|collapse|toggle sidebar/i,
      });
      expect(toggleBtn).toBeInTheDocument();
    });

    it("点击收起按钮后侧边栏变为收起状态", async () => {
      render(<Sidebar />);
      // Wait for sessions to appear
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      const toggleBtn = screen.getByRole("button", {
        name: /收起|折叠|collapse|toggle sidebar/i,
      });

      // 点击收起
      fireEvent.click(toggleBtn);

      // 收起后会话列表不可见
      expect(screen.queryByText("会话一")).not.toBeInTheDocument();
    });

    it("收起后再次点击按钮可展开侧边栏", async () => {
      render(<Sidebar />);
      // Wait for sessions to appear
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      const toggleBtn = screen.getByRole("button", {
        name: /收起|折叠|collapse|toggle sidebar/i,
      });

      // 收起
      fireEvent.click(toggleBtn);
      expect(screen.queryByText("会话一")).not.toBeInTheDocument();

      // 展开 - 收起后出现展开按钮，aria-label 仍匹配
      const expandBtn = screen.getByRole("button", {
        name: /收起|折叠|collapse|toggle sidebar/i,
      });
      fireEvent.click(expandBtn);

      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });
    });
  });

  // ── Cycle 2: Skeleton 加载态 ──

  describe("会话列表加载态", () => {
    it("加载中显示 Skeleton 占位条", () => {
      // fetchSessions 不 resolve，保持 loading 状态
      mockFetchSessions.mockReturnValue(new Promise(() => {}));
      chatStateOverride = { sessions: [] };
      render(<Sidebar />);

      // 应有骨架占位条
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // ── Cycle 3: 会话列表 CRUD 操作 ──

  describe("会话列表 CRUD", () => {
    it("点击新建会话按钮调用 createSession", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      const newBtn = screen.getByRole("button", { name: /新建对话/i });
      fireEvent.click(newBtn);

      expect(mockCreateSession).toHaveBeenCalled();
    });

    it("点击会话项调用 switchSession", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话二")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("会话二"));
      expect(mockSwitchSession).toHaveBeenCalledWith("s2");
    });

    it("hover 时显示重命名和删除按钮", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      const sessionItem = screen.getByText("会话一").closest("[class*=\"group\"]")!;
      fireEvent.mouseEnter(sessionItem);

      const renameBtn = screen.getByRole("button", { name: /重命名/i });
      const deleteBtn = screen.getByRole("button", { name: /删除/i });
      expect(renameBtn).toBeInTheDocument();
      expect(deleteBtn).toBeInTheDocument();
    });

    it("点击删除按钮调用 deleteSession", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      const sessionItem = screen.getByText("会话一").closest("[class*=\"group\"]")!;
      fireEvent.mouseEnter(sessionItem);

      const deleteBtn = screen.getByRole("button", { name: /删除/i });
      fireEvent.click(deleteBtn);
      expect(mockDeleteSession).toHaveBeenCalledWith("s1");
    });
  });

  // ── Cycle 4: 顶部导航栏 ──

  describe("顶部导航栏", () => {
    it("显示品牌 Logo 和名称 Pi Chat", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      // 品牌名称
      expect(screen.getByText("Pi Chat")).toBeInTheDocument();

      // 品牌 Logo（内容为 P 的元素）
      const logo = screen.getByText("P");
      expect(logo).toBeInTheDocument();
    });

    it("顶部导航有新建对话按钮（笔图标）", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      const newChatBtn = screen.getByRole("button", { name: /新建对话/i });
      expect(newChatBtn).toBeInTheDocument();
    });
  });

  // ── 主题切换 ──

  describe("主题切换", () => {
    it("底部显示主题切换按钮", async () => {
      render(<Sidebar />);
      await waitFor(() => {
        expect(screen.getByText("会话一")).toBeInTheDocument();
      });

      expect(screen.getByText(/暗色模式|亮色模式/)).toBeInTheDocument();
    });
  });
});
