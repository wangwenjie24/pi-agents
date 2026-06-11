import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { ToolCallCard } from "./ToolCallCard.js";
import type { ToolCall } from "../chat-store.js";

/**
 * 切片 4 测试：ToolCallCard 组件
 *
 * 行为：
 * - 卡片展示工具名和状态指示
 * - 运行中的工具有脉动动画（animate-pulse）
 * - 完成的工具无脉动动画
 * - 点击可折叠/展开详情
 * - 展开后以表格形式展示参数和结果
 * - running 状态显示"执行中"
 * - done 状态显示"已完成"
 */

describe("ToolCallCard", () => {
  afterEach(() => {
    cleanup();
  });

  const baseToolCall: ToolCall = {
    toolName: "tavily_search",
    status: "done",
    result: "北京今天 25°C 晴",
  };

  it("显示工具名称", () => {
    render(<ToolCallCard toolCall={baseToolCall} />);
    expect(screen.getByText("tavily_search")).toBeInTheDocument();
  });

  it("done 状态显示'已完成'", () => {
    render(<ToolCallCard toolCall={baseToolCall} />);
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  it("running 状态显示'执行中'", () => {
    const runningTool: ToolCall = { toolName: "read", status: "running" };
    render(<ToolCallCard toolCall={runningTool} />);
    expect(screen.getByText("执行中")).toBeInTheDocument();
  });

  it("running 状态有脉动动画", () => {
    const runningTool: ToolCall = { toolName: "read", status: "running" };
    render(<ToolCallCard toolCall={runningTool} />);
    const indicator = screen.getByTestId("tool-status-dot");
    expect(indicator.className).toMatch(/animate-pulse/);
  });

  it("done 状态无脉动动画", () => {
    render(<ToolCallCard toolCall={baseToolCall} />);
    const indicator = screen.getByTestId("tool-status-dot");
    expect(indicator.className).not.toMatch(/animate-pulse/);
  });

  it("默认折叠详情", () => {
    const toolWithOutput: ToolCall = {
      toolName: "read",
      status: "done",
      output: "部分输出...",
      result: "最终结果",
    };
    render(<ToolCallCard toolCall={toolWithOutput} />);
    // 详情区域应该不存在
    expect(screen.queryByTestId("tool-detail-table")).not.toBeInTheDocument();
  });

  it("点击展开后显示详情表格", async () => {
    const user = userEvent.setup();
    const toolWithOutput: ToolCall = {
      toolName: "read",
      status: "done",
      output: "部分输出...",
      result: "最终结果",
    };
    render(<ToolCallCard toolCall={toolWithOutput} />);

    const card = screen.getByTestId("tool-call-card");
    await user.click(card);

    expect(screen.getByTestId("tool-detail-table")).toBeInTheDocument();
  });

  it("展开后显示结果内容", async () => {
    const user = userEvent.setup();
    const toolWithResult: ToolCall = {
      toolName: "tavily_search",
      status: "done",
      result: "北京今天 25°C 晴",
    };
    render(<ToolCallCard toolCall={toolWithResult} />);

    const card = screen.getByTestId("tool-call-card");
    await user.click(card);

    expect(screen.getByText("北京今天 25°C 晴")).toBeInTheDocument();
  });

  it("展开后显示 output 内容", async () => {
    const user = userEvent.setup();
    const toolWithOutput: ToolCall = {
      toolName: "read",
      status: "done",
      output: "流式输出内容",
      result: "最终结果",
    };
    render(<ToolCallCard toolCall={toolWithOutput} />);

    const card = screen.getByTestId("tool-call-card");
    await user.click(card);

    expect(screen.getByText("流式输出内容")).toBeInTheDocument();
  });

  it("再次点击折叠详情", async () => {
    const user = userEvent.setup();
    const toolWithOutput: ToolCall = {
      toolName: "read",
      status: "done",
      output: "部分输出...",
      result: "最终结果",
    };
    render(<ToolCallCard toolCall={toolWithOutput} />);

    const card = screen.getByTestId("tool-call-card");
    await user.click(card);
    expect(screen.getByTestId("tool-detail-table")).toBeInTheDocument();

    await user.click(card);
    expect(screen.queryByTestId("tool-detail-table")).not.toBeInTheDocument();
  });

  it("running 状态默认展开", () => {
    const runningTool: ToolCall = {
      toolName: "read",
      status: "running",
      output: "正在处理...",
    };
    render(<ToolCallCard toolCall={runningTool} />);
    expect(screen.getByTestId("tool-detail-table")).toBeInTheDocument();
  });
});
