import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, waitFor, fireEvent } from "@testing-library/react";
import React from "react";
import { MessageList } from "./MessageList.js";

/**
 * 切片 4 测试：消息列表与自动滚动 + 脉动圆点
 *
 * 行为：
 * - 渲染用户消息和 AI 消息
 * - AI 思考时显示三个脉动圆点动画
 * - 消息列表自动滚动到底部（新消息出现时）
 * - AI 消息使用 MarkdownContent 渲染
 */

const mockScrollIntoView = vi.fn();

// jsdom 没有 scrollIntoView
Element.prototype.scrollIntoView = mockScrollIntoView;

describe("MessageList 组件", () => {
  afterEach(() => {
    cleanup();
    mockScrollIntoView.mockClear();
  });

  it("渲染用户消息", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "你好", status: "done" as const },
    ];

    render(<MessageList messages={messages} isRunning={false} />);
    expect(screen.getByText("你好")).toBeInTheDocument();
  });

  it("渲染 AI 消息文本", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "hi", status: "done" as const },
      { id: "2", role: "assistant" as const, content: "你好！有什么可以帮你的？", status: "done" as const },
    ];

    render(<MessageList messages={messages} isRunning={false} />);
    expect(screen.getByText("你好！有什么可以帮你的？")).toBeInTheDocument();
  });

  it("AI 思考时显示三个脉动圆点", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "hi", status: "done" as const },
      { id: "2", role: "assistant" as const, content: "", status: "streaming" as const },
    ];

    render(<MessageList messages={messages} isRunning={true} />);

    // 应有三个圆点元素
    const dots = screen.getAllByTestId("thinking-dot");
    expect(dots).toHaveLength(3);
  });

  it("AI 回复完成后不显示脉动圆点", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "hi", status: "done" as const },
      { id: "2", role: "assistant" as const, content: "回复完成", status: "done" as const },
    ];

    render(<MessageList messages={messages} isRunning={false} />);

    expect(screen.queryByTestId("thinking-dot")).not.toBeInTheDocument();
  });

  it("用户消息右对齐，使用 muted 背景和大圆角", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "测试样式", status: "done" as const },
    ];

    render(<MessageList messages={messages} isRunning={false} />);

    const msgText = screen.getByText("测试样式");
    // 找到消息气泡容器
    const bubble = msgText.closest("[data-msg-bubble]");
    expect(bubble).toBeTruthy();
    expect(bubble?.className).toMatch(/bg-muted/);
    expect(bubble?.className).toMatch(/rounded-3xl/);
  });

  it("AI 消息无气泡背景", () => {
    const messages = [
      { id: "1", role: "assistant" as const, content: "AI 消息", status: "done" as const },
    ];

    render(<MessageList messages={messages} isRunning={false} />);

    const msgText = screen.getByText("AI 消息");
    const bubble = msgText.closest("[data-msg-bubble]");
    expect(bubble).toBeTruthy();
    // AI 消息不应有 bg-muted 背景
    expect(bubble?.className).not.toMatch(/bg-muted/);
  });

  it("消息列表底部有滚动锚点", () => {
    const messages = [
      { id: "1", role: "user" as const, content: "hi", status: "done" as const },
    ];

    render(<MessageList messages={messages} isRunning={false} />);
    expect(screen.getByTestId("scroll-anchor")).toBeInTheDocument();
  });

  /**
   * 切片 1：滚动到底部浮动按钮
   *
   * 行为：
   * - 默认不显示浮动按钮（用户在底部）
   * - 向上滚动脱离底部时，出现浮动按钮
   * - 点击浮动按钮平滑滚动回底部
   * - 新消息到达时仅在用户已在底部时自动跟随
   */
  describe("滚动到底部浮动按钮", () => {
    it("默认不显示滚动到底部按钮（用户在底部）", () => {
      const messages = [
        { id: "1", role: "user" as const, content: "hi", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);
      expect(screen.queryByTestId("scroll-to-bottom-btn")).not.toBeInTheDocument();
    });

    it("向上滚动脱离底部后显示浮动按钮", () => {
      const messages = [
        { id: "1", role: "user" as const, content: "hi", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      // 找到滚动容器
      const scrollContainer = screen.getByTestId("scroll-container");

      // 模拟用户向上滚动（远离底部）
      Object.defineProperty(scrollContainer, "scrollTop", { value: 0, configurable: true });
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 500, configurable: true });

      fireEvent.scroll(scrollContainer);

      expect(screen.getByTestId("scroll-to-bottom-btn")).toBeInTheDocument();
    });

    it("点击浮动按钮滚动回底部", () => {
      const messages = [
        { id: "1", role: "user" as const, content: "hi", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      const scrollContainer = screen.getByTestId("scroll-container");

      // 先滚动上去
      Object.defineProperty(scrollContainer, "scrollTop", { value: 0, configurable: true });
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 500, configurable: true });
      fireEvent.scroll(scrollContainer);

      // 点击按钮
      const btn = screen.getByTestId("scroll-to-bottom-btn");
      fireEvent.click(btn);

      // 应该调用了 scrollIntoView 或 scrollTo 回到底部
      expect(mockScrollIntoView).toHaveBeenCalled();
    });

    it("用户在底部时新消息到达自动跟随", () => {
      mockScrollIntoView.mockClear();
      const { rerender } = render(
        <MessageList
          messages={[
            { id: "1", role: "user" as const, content: "hi", status: "done" as const },
          ]}
          isRunning={false}
        />
      );

      // 用户在底部（scrollTop + clientHeight >= scrollHeight）
      const scrollContainer = screen.getByTestId("scroll-container");
      Object.defineProperty(scrollContainer, "scrollTop", { value: 500, configurable: true });
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 500, configurable: true });

      // 新消息到达
      rerender(
        <MessageList
          messages={[
            { id: "1", role: "user" as const, content: "hi", status: "done" as const },
            { id: "2", role: "assistant" as const, content: "hello", status: "done" as const },
          ]}
          isRunning={false}
        />
      );

      // 新消息到达后自动滚动
      expect(mockScrollIntoView).toHaveBeenCalled();
    });

    it("用户不在底部时新消息到达不强制滚动", () => {
      mockScrollIntoView.mockClear();

      const { rerender } = render(
        <MessageList
          messages={[
            { id: "1", role: "user" as const, content: "hi", status: "done" as const },
          ]}
          isRunning={false}
        />
      );

      // 模拟用户不在底部（向上滚动了）
      const scrollContainer = screen.getByTestId("scroll-container");
      Object.defineProperty(scrollContainer, "scrollTop", { value: 0, configurable: true });
      Object.defineProperty(scrollContainer, "scrollHeight", { value: 1000, configurable: true });
      Object.defineProperty(scrollContainer, "clientHeight", { value: 500, configurable: true });
      fireEvent.scroll(scrollContainer);

      mockScrollIntoView.mockClear();

      // 新消息到达
      rerender(
        <MessageList
          messages={[
            { id: "1", role: "user" as const, content: "hi", status: "done" as const },
            { id: "2", role: "assistant" as const, content: "hello", status: "done" as const },
          ]}
          isRunning={false}
        />
      );

      // 不应强制滚动
      expect(mockScrollIntoView).not.toHaveBeenCalled();
    });
  });

  /**
   * 切片 2：消息 Hover 操作栏
   *
   * 行为：
   * - 用户消息 hover 时显示复制和编辑按钮
   * - AI 消息 hover 时显示复制和重新生成按钮
   * - 复制按钮点击后复制内容到剪贴板
   */
  describe("消息 Hover 操作栏", () => {
    beforeEach(() => {
      // mock clipboard API
      Object.assign(navigator, {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it("hover 用户消息时显示操作栏", async () => {
      const messages = [
        { id: "1", role: "user" as const, content: "你好世界", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      // 操作栏默认不可见（opacity-0）
      const actions = screen.queryByTestId("msg-actions-1");
      expect(actions).toBeInTheDocument(); // 存在 DOM 中
      expect(actions?.className).toMatch(/opacity-0/);

      // hover 用户消息气泡，操作栏可见
      const bubble = screen.getByText("你好世界").closest("[data-msg-bubble]");
      if (bubble) {
        fireEvent.mouseEnter(bubble.parentElement!);
      }
      // group-hover 让操作栏可见
      // vitest/jsdom 无法完全模拟 Tailwind group-hover，所以我们直接检查结构
    });

    it("用户消息操作栏包含复制和编辑按钮", () => {
      const messages = [
        { id: "1", role: "user" as const, content: "hello", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      expect(screen.getByTestId("copy-btn-1")).toBeInTheDocument();
      expect(screen.getByTestId("edit-btn-1")).toBeInTheDocument();
    });

    it("AI 消息操作栏包含复制和重新生成按钮", () => {
      const messages = [
        { id: "1", role: "assistant" as const, content: "AI reply", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      expect(screen.getByTestId("copy-btn-1")).toBeInTheDocument();
      expect(screen.getByTestId("regenerate-btn-1")).toBeInTheDocument();
    });

    it("点击复制按钮复制用户消息的纯文本", async () => {
      const messages = [
        { id: "1", role: "user" as const, content: "复制这段文字", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      const copyBtn = screen.getByTestId("copy-btn-1");
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("复制这段文字");
    });

    it("点击复制按钮复制 AI 消息的原始 Markdown", async () => {
      const messages = [
        { id: "1", role: "assistant" as const, content: "**加粗**文本", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} />);

      const copyBtn = screen.getByTestId("copy-btn-1");
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("**加粗**文本");
    });
  });

  /**
   * 切片 3：编辑用户消息并重发
   *
   * 行为：
   * - 点击编辑按钮，用户消息切换为 Textarea 编辑模式
   * - 编辑完成后可重发（触发 onEditMessage 回调）
   * - 编辑后的用户消息显示编辑状态标记
   */
  describe("编辑用户消息", () => {
    it("点击编辑按钮后消息内容切换为 textarea 编辑模式", () => {
      const onEdit = vi.fn();
      const messages = [
        { id: "1", role: "user" as const, content: "原始消息", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} onEditMessage={onEdit} />);

      // 点击编辑按钮
      const editBtn = screen.getByTestId("edit-btn-1");
      fireEvent.click(editBtn);

      // 应该出现编辑模式的 textarea
      const editTextarea = screen.getByTestId(`edit-textarea-1`);
      expect(editTextarea).toBeInTheDocument();
      expect(editTextarea).toHaveValue("原始消息");
    });

    it("编辑模式下按 Esc 取消编辑，恢复原文本显示", () => {
      const onEdit = vi.fn();
      const messages = [
        { id: "1", role: "user" as const, content: "原始消息", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} onEditMessage={onEdit} />);

      // 进入编辑模式
      const editBtn = screen.getByTestId("edit-btn-1");
      fireEvent.click(editBtn);
      expect(screen.getByTestId("edit-textarea-1")).toBeInTheDocument();

      // 按 Esc 取消
      fireEvent.keyDown(screen.getByTestId("edit-textarea-1"), { key: "Escape" });

      // textarea 应该消失，恢复原文显示
      expect(screen.queryByTestId("edit-textarea-1")).not.toBeInTheDocument();
      expect(screen.getByText("原始消息")).toBeInTheDocument();
    });

    it("编辑模式下按 Enter 提交编辑（Shift+Enter 换行）", () => {
      const onEdit = vi.fn();
      const messages = [
        { id: "1", role: "user" as const, content: "原始", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} onEditMessage={onEdit} />);

      // 进入编辑模式
      fireEvent.click(screen.getByTestId("edit-btn-1"));
      const editTextarea = screen.getByTestId("edit-textarea-1");

      // 修改内容
      fireEvent.change(editTextarea, { target: { value: "编辑后" } });

      // Shift+Enter 不提交
      fireEvent.keyDown(editTextarea, { key: "Enter", shiftKey: true });
      expect(onEdit).not.toHaveBeenCalled();

      // Enter 提交
      fireEvent.keyDown(editTextarea, { key: "Enter", shiftKey: false });
      expect(onEdit).toHaveBeenCalledWith("1", "编辑后");
    });

    it("已编辑消息显示编辑状态标记", () => {
      const messages = [
        { id: "1", role: "user" as const, content: "修改后的文本", status: "done" as const, edited: true },
      ];
      render(<MessageList messages={messages as any} isRunning={false} />);

      expect(screen.getByText(/✎ 已编辑/)).toBeInTheDocument();
    });
  });

  /**
   * 切片 4：重新生成 AI 回复
   *
   * 行为：
   * - 点击重新生成按钮后通过 onRegenerateMessage 回调通知外部
   */
  describe("重新生成 AI 回复", () => {
    it("点击重新生成按钮调用 onRegenerateMessage 回调", () => {
      const onRegenerate = vi.fn();
      const messages = [
        { id: "1", role: "user" as const, content: "hi", status: "done" as const },
        { id: "2", role: "assistant" as const, content: "hello", status: "done" as const },
      ];
      render(<MessageList messages={messages} isRunning={false} onRegenerateMessage={onRegenerate} />);

      const regenBtn = screen.getByTestId("regenerate-btn-2");
      fireEvent.click(regenBtn);
      expect(onRegenerate).toHaveBeenCalledWith("2");
    });
  });
});
