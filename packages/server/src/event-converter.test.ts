import { describe, it, expect } from "vitest";
import { convertEvent } from "./event-converter.js";
import type { ServerMessage } from "@pi-chat/shared";

/**
 * 测试 convertEvent 函数：将 PI Agent SDK 的 AgentSessionEvent
 * 转换为自定义消息协议的 ServerMessage 数组。
 *
 * 这是纯函数，输入 SDK 事件，输出我们的消息协议。
 * 对 SDK 的依赖仅限于类型，测试中构造符合类型结构的普通对象。
 */
describe("convertEvent", () => {
  // ── text_delta → chat_delta ──

  it("将 message_update.text_delta 转换为 chat_delta", () => {
    const messages = convertEvent({
      type: "message_update",
      message: { role: "assistant" } as any,
      assistantMessageEvent: {
        type: "text_delta",
        contentIndex: 0,
        delta: "你好",
        partial: {} as any,
      },
    });

    expect(messages).toEqual([{ type: "chat_delta", delta: "你好" }]);
  });

  // ── agent_start → agent_start ──

  it("将 agent_start 事件转换为 agent_start 消息", () => {
    const messages = convertEvent({ type: "agent_start" });

    expect(messages).toEqual([{ type: "agent_start" }]);
  });

  // ── agent_end → agent_end + chat_done ──

  it("将 agent_end 事件转换为 agent_end 和 chat_done 消息", () => {
    const messages = convertEvent({
      type: "agent_end",
      messages: [],
      willRetry: false,
    });

    expect(messages).toEqual([{ type: "agent_end" }, { type: "chat_done" }]);
  });

  // ── tool_execution_start → tool_start ──

  it("将 tool_execution_start 转换为 tool_start", () => {
    const messages = convertEvent({
      type: "tool_execution_start",
      toolCallId: "call-1",
      toolName: "read",
      args: { path: "/tmp/test.txt" },
    });

    expect(messages).toEqual([{ type: "tool_start", toolName: "read" }]);
  });

  // ── tool_execution_end → tool_end ──

  it("将 tool_execution_end 转换为 tool_end", () => {
    const messages = convertEvent({
      type: "tool_execution_end",
      toolCallId: "call-1",
      toolName: "read",
      result: "file contents here",
      isError: false,
    });

    expect(messages).toEqual([{ type: "tool_end", result: "file contents here" }]);
  });

  // ── tool_execution_update → tool_update ──

  it("将 tool_execution_update 转换为 tool_update", () => {
    const messages = convertEvent({
      type: "tool_execution_update",
      toolCallId: "call-1",
      toolName: "bash",
      args: {},
      partialResult: "partial output...",
    });

    expect(messages).toEqual([{ type: "tool_update", output: "partial output..." }]);
  });

  // ── 忽略不相关事件 ──

  it("忽略 message_start / message_end / turn_start / turn_end 等非核心事件", () => {
    const irrelevantEvents = [
      { type: "message_start", message: {} },
      { type: "message_end", message: {} },
      { type: "turn_start" },
      { type: "turn_end", message: {}, toolResults: [] },
      { type: "queue_update", steering: [], followUp: [] },
    ];

    for (const event of irrelevantEvents) {
      expect(convertEvent(event as any)).toEqual([]);
    }
  });
});
