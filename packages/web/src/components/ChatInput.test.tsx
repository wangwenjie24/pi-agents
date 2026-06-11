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

  /**
   * 切片 5：文件拖拽上传 + 预览
   *
   * 行为：
   * - 拖拽文件到输入区域时显示文件预览
   * - 预览包含文件名和移除按钮
   * - 点击移除按钮移除文件
   * - 拖拽时输入区域显示高亮样式
   */
  describe("文件拖拽上传", () => {
    // 创建模拟文件
    function createFile(name: string, type: string, size = 1024) {
      const file = new File(["x".repeat(size)], name, { type });
      return file;
    }

    it("拖拽文件到输入区域后显示文件预览", () => {
      render(
        <ChatInput
          connected={true}
          isRunning={false}
          sendPrompt={mockSendPrompt}
          sendAbort={mockSendAbort}
        />
      );

      const dropZone = screen.getByTestId("chat-input-drop-zone");
      const file = createFile("test.txt", "text/plain");

      // 触发 drop 事件
      const dropEvent = new Event("drop", { bubbles: true });
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: { files: [file], types: ["Files"] },
      });
      fireEvent(dropZone, dropEvent);

      // 应该显示文件预览
      expect(screen.getByText("test.txt")).toBeInTheDocument();
    });

    it("文件预览包含移除按钮，点击后移除文件", () => {
      render(
        <ChatInput
          connected={true}
          isRunning={false}
          sendPrompt={mockSendPrompt}
          sendAbort={mockSendAbort}
        />
      );

      const dropZone = screen.getByTestId("chat-input-drop-zone");
      const file = createFile("photo.jpg", "image/jpeg");

      const dropEvent = new Event("drop", { bubbles: true });
      Object.defineProperty(dropEvent, "dataTransfer", {
        value: { files: [file], types: ["Files"] },
      });
      fireEvent(dropZone, dropEvent);

      expect(screen.getByText("photo.jpg")).toBeInTheDocument();

      // 点击移除按钮
      const removeBtn = screen.getByTestId("remove-file-0");
      fireEvent.click(removeBtn);

      // 文件预览应消失
      expect(screen.queryByText("photo.jpg")).not.toBeInTheDocument();
    });

    it("拖拽进入时显示高亮状态", () => {
      render(
        <ChatInput
          connected={true}
          isRunning={false}
          sendPrompt={mockSendPrompt}
          sendAbort={mockSendAbort}
        />
      );

      const dropZone = screen.getByTestId("chat-input-drop-zone");

      fireEvent.dragOver(dropZone, {
        dataTransfer: { types: ["Files"] },
      });

      expect(dropZone.className).toMatch(/ring/);
    });
  });

  /**
   * 切片 6：粘贴图片
   *
   * 行为：
   * - 在 textarea 中粘贴图片时，图片出现在文件预览区
   */
  describe("粘贴图片", () => {
    it("粘贴图片时图片出现在文件预览区", () => {
      render(
        <ChatInput
          connected={true}
          isRunning={false}
          sendPrompt={mockSendPrompt}
          sendAbort={mockSendAbort}
        />
      );

      const textarea = screen.getByPlaceholderText("Type your message...");

      // 模拟粘贴图片
      const imageFile = new File(["image-data"], "screenshot.png", { type: "image/png" });
      const pasteEvent = new Event("paste", { bubbles: true });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          files: [imageFile],
          types: ["Files"],
        },
      });
      fireEvent(textarea, pasteEvent);

      expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    });

    it("粘贴文本时不触发文件添加", async () => {
      render(
        <ChatInput
          connected={true}
          isRunning={false}
          sendPrompt={mockSendPrompt}
          sendAbort={mockSendAbort}
        />
      );

      const textarea = screen.getByPlaceholderText("Type your message...");

      // 模拟粘贴纯文本
      const pasteEvent = new Event("paste", { bubbles: true });
      Object.defineProperty(pasteEvent, "clipboardData", {
        value: {
          files: [],
          types: ["text/plain"],
          getData: () => "hello",
        },
      });
      fireEvent(textarea, pasteEvent);

      // 不应有文件预览
      expect(screen.queryByTestId(/remove-file/)).not.toBeInTheDocument();
    });
  });
});
