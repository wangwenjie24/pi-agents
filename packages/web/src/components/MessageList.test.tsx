import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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
});
