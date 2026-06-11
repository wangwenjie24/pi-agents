import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ChatInput } from "./ChatInput.js";

/**
 * 切片 5 测试：输入区域
 *
 * 行为：
 * - 底部固定的圆角输入框（textarea）
 * - Enter 发送，Shift+Enter 换行
 * - 输入为空时发送按钮禁用
 * - AI 响应期间发送按钮变为 Cancel 按钮
 * - 未连接时输入禁用
 */

const mockSendPrompt = vi.fn();
const mockSendAbort = vi.fn();

describe("ChatInput 组件", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("渲染 textarea 输入框，占位文字为 'Type your message...'", () => {
    render(
      <ChatInput
        connected={true}
        isRunning={false}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );
    const textarea = screen.getByPlaceholderText("Type your message...");
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe("TEXTAREA");
  });

  it("输入为空时发送按钮禁用", () => {
    render(
      <ChatInput
        connected={true}
        isRunning={false}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );
    const sendBtn = screen.getByRole("button", { name: /send|发送/i });
    expect(sendBtn).toBeDisabled();
  });

  it("输入内容后发送按钮启用", async () => {
    render(
      <ChatInput
        connected={true}
        isRunning={false}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );
    const textarea = screen.getByPlaceholderText("Type your message...");
    await userEvent.type(textarea, "hello");

    const sendBtn = screen.getByRole("button", { name: /send|发送/i });
    expect(sendBtn).not.toBeDisabled();
  });

  it("Enter 键发送消息，Shift+Enter 换行", async () => {
    render(
      <ChatInput
        connected={true}
        isRunning={false}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );
    const textarea = screen.getByPlaceholderText("Type your message...");

    // 输入文字
    await userEvent.type(textarea, "hello");

    // 按 Shift+Enter 应该换行（不发送）
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });
    expect(mockSendPrompt).not.toHaveBeenCalled();

    // 按 Enter（无 Shift）应发送
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    expect(mockSendPrompt).toHaveBeenCalledWith("hello");
  });

  it("AI 响应期间显示 Cancel 按钮", () => {
    render(
      <ChatInput
        connected={true}
        isRunning={true}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );

    // 不应有发送按钮
    expect(screen.queryByRole("button", { name: /send|发送/i })).not.toBeInTheDocument();

    // 应有 Cancel 按钮
    const cancelBtn = screen.getByRole("button", { name: /cancel|取消|abort|中断/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  it("点击 Cancel 按钮调用 sendAbort", () => {
    render(
      <ChatInput
        connected={true}
        isRunning={true}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );

    const cancelBtn = screen.getByRole("button", { name: /cancel|取消|abort|中断/i });
    fireEvent.click(cancelBtn);
    expect(mockSendAbort).toHaveBeenCalled();
  });

  it("未连接时输入框禁用", () => {
    render(
      <ChatInput
        connected={false}
        isRunning={false}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );
    const textarea = screen.getByPlaceholderText("Type your message...");
    expect(textarea).toBeDisabled();
  });

  it("发送后清空输入框", async () => {
    render(
      <ChatInput
        connected={true}
        isRunning={false}
        sendPrompt={mockSendPrompt}
        sendAbort={mockSendAbort}
      />
    );
    const textarea = screen.getByPlaceholderText("Type your message...");

    await userEvent.type(textarea, "test message");
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    // 发送后输入框应清空
    expect(textarea).toHaveValue("");
  });
});
