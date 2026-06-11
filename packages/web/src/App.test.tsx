import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

/**
 * Issue #17 测试：App 布局
 * - 三栏 Grid 布局就位，右侧面板可扩展
 * - 顶部导航栏在对话开始后显示
 */

// ── Mock framer-motion ──
vi.mock("framer-motion", () => ({
  motion: new Proxy(
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
  ),
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

// ── Mock @radix-ui/react-dialog ──
vi.mock("@radix-ui/react-dialog", () => {
  const React = require("react");
  return {
    Root: ({ children, open }: { children: React.ReactNode; open?: boolean }) => {
      // Always render children, but pass open state down
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

let chatStateOverride: Record<string, unknown> = {};

const baseChatState: Record<string, unknown> = {
  connected: true,
  isRunning: false,
  messages: [],
  sessions: [
    { id: "s1", name: "会话一", createdAt: "2024-01-01", updatedAt: "2024-01-01" },
  ],
  activeSessionId: "s1",
  connectionStatus: "connected",
  sendPrompt: vi.fn(),
  sendAbort: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  fetchSessions: vi.fn().mockResolvedValue(undefined),
  createSession: vi.fn().mockResolvedValue({
    id: "new-1", name: "新会话", createdAt: "", updatedAt: "",
  }),
  deleteSession: vi.fn().mockResolvedValue(undefined),
  renameSession: vi.fn().mockResolvedValue(undefined),
  switchSession: vi.fn(),
  editMessage: vi.fn(),
  regenerateMessage: vi.fn(),
  messagesMap: {},
  pendingMessages: [],
  ws: null,
  _onServerMessage: vi.fn(),
};

// Same pattern as WelcomePage.test.tsx — selector-based mock
// with getState / setState for Sidebar's useEffect
vi.mock("./chat-store.js", () => {
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

vi.mock("./config-store.js", () => ({
  useConfigStore: (selector: any) =>
    typeof selector === "function"
      ? selector({ provider: "openai", model: "gpt-4o" })
      : { provider: "openai", model: "gpt-4o" },
}));

vi.mock("./ChatRuntimeProvider.js", () => ({
  ChatRuntimeProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("./theme-store.js", () => ({
  useThemeStore: (selector: any) => {
    const state = { theme: "light", toggle: vi.fn(), initFromStorage: vi.fn() };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

// Default: desktop mode
const mockUseIsMobile = vi.fn(() => false);
vi.mock("./hooks/use-is-mobile.js", () => ({
  useIsMobile: () => mockUseIsMobile(),
}));

const { App } = await import("./App.js");

describe("App 布局 - Issue #17", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    baseChatState.fetchSessions = vi.fn().mockResolvedValue(undefined);
    baseChatState.createSession = vi.fn().mockResolvedValue({
      id: "new-1", name: "新会话", createdAt: "", updatedAt: "",
    });
    chatStateOverride = {};
  });

  afterEach(() => {
    cleanup();
    mockUseIsMobile.mockReturnValue(false);
  });

  describe("三栏 Grid 布局", () => {
    it("App 根布局使用 CSS Grid（data-testid=app-grid）", () => {
      const { container } = render(<App />);
      const gridContainer = container.querySelector("[data-testid=\"app-grid\"]");
      expect(gridContainer).toBeInTheDocument();
    });

    it("右侧面板默认折叠（gridTemplateColumns 包含 0fr）", () => {
      const { container } = render(<App />);
      const gridContainer = container.querySelector("[data-testid=\"app-grid\"]") as HTMLElement;
      expect(gridContainer?.style.gridTemplateColumns).toMatch(/0fr/);
    });
  });

  describe("移动端 Sheet", () => {
    it("移动端侧边栏以 Sheet 形式呈现（点击按钮后出现 Sheet）", async () => {
      mockUseIsMobile.mockReturnValue(true);

      render(<App />);

      // 点击打开侧边栏按钮
      fireEvent.click(screen.getByRole("button", { name: /打开侧边栏/i }));

      // Sheet 打开后 data-open 变为 "true"
      await waitFor(() => {
        const sheetRoot = screen.getByTestId("sheet-root");
        expect(sheetRoot).toHaveAttribute("data-open", "true");
      });
    });
  });

  describe("顶部导航栏显示逻辑", () => {
    it("有消息时显示顶部导航栏", async () => {
      chatStateOverride = {
        messages: [{ id: "m1", role: "user" as const, content: "hello", status: "done" as const }],
      };

      render(<App />);
      await waitFor(() => {
        expect(screen.getByTestId("top-navbar")).toBeInTheDocument();
      });
    });

    it("无消息时不显示顶部导航栏（欢迎页模式）", async () => {
      chatStateOverride = { messages: [] };

      render(<App />);
      await waitFor(() => {
        expect(screen.queryByTestId("top-navbar")).not.toBeInTheDocument();
      });
    });
  });
});
