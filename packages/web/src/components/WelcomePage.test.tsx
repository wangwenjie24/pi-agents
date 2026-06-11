import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";

/**
 * 切片 2 测试：欢迎页与聊天界面切换
 *
 * 行为：
 * - 无消息时显示品牌 Logo + 名称居中，输入区域偏上
 * - 发送第一条消息后欢迎页消失，进入聊天界面
 * - 用户消息右对齐、muted 背景、大圆角
 * - AI 消息无气泡，直接渲染
 */

// ── Mock stores — 需要在导入被测组件之前 ──

const mockSendPrompt = vi.fn();
const mockSendAbort = vi.fn();
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();

let chatStateOverride: Record<string, any> = {};

function setChatState(overrides: Record<string, any>) {
  chatStateOverride = overrides;
}

const baseChatState = {
  connected: true,
  isRunning: false,
  messages: [] as any[],
  activeSessionId: "test-session",
  connectionStatus: "connected" as string,
  sendPrompt: mockSendPrompt,
  sendAbort: mockSendAbort,
  connect: mockConnect,
  disconnect: mockDisconnect,
  sessions: [],
  messagesMap: {},
  pendingMessages: [],
  ws: null,
  fetchSessions: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  renameSession: vi.fn(),
  switchSession: vi.fn(),
  _onServerMessage: vi.fn(),
};

vi.mock("../chat-store.js", () => ({
  useChatStore: (selector: any) => {
    const state = { ...baseChatState, ...chatStateOverride };
    return typeof selector === "function" ? selector(state) : state;
  },
}));

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

// 在 mock 之后导入
const { WelcomePage } = await import("./WelcomePage.js");

describe("WelcomePage 组件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatStateOverride = {};
  });

  afterEach(() => {
    cleanup();
  });

  it("显示品牌名称 Pi Chat", () => {
    render(<WelcomePage />);
    expect(screen.getByText("Pi Chat")).toBeInTheDocument();
  });

  it("显示输入框，占位文字为 'Type your message...'", () => {
    render(<WelcomePage />);
    const input = screen.getByPlaceholderText("Type your message...");
    expect(input).toBeInTheDocument();
  });

  it("输入为空时发送按钮禁用", () => {
    render(<WelcomePage />);
    const sendBtn = screen.getByRole("button", { name: /send|发送/i });
    expect(sendBtn).toBeDisabled();
  });

  it("未连接时输入区域禁用", () => {
    chatStateOverride = { connected: false };
    render(<WelcomePage />);
    const input = screen.getByPlaceholderText("Type your message...");
    expect(input).toBeDisabled();
  });
});
