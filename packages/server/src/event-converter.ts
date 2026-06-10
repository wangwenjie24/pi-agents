import type { ServerMessage } from "@pi-chat/shared";

/**
 * SDK 事件的最小子集 — 只声明我们关心的字段。
 * 测试通过构造符合这个 shape 的普通对象来验证转换逻辑，
 * 不依赖 SDK 运行时，也不 mock 内部模块。
 */
interface SdkEvent {
  type: string;
  assistantMessageEvent?: { type: string; delta?: string; [key: string]: unknown };
  toolName?: string;
  result?: unknown;
  partialResult?: unknown;
  messages?: unknown[];
  willRetry?: boolean;
  error?: unknown;
  // 允许 SDK 事件的额外字段通过（测试中构造完整 SDK 事件对象）
  [key: string]: unknown;
}

/**
 * 将 PI Agent SDK 的 AgentSessionEvent 转换为自定义消息协议。
 *
 * 纯函数：一个 SDK 事件可以产生 0~N 个 ServerMessage。
 * 这是后端消息协议层的核心，隔离前端对 SDK 事件类型的直接依赖。
 */
export function convertEvent(event: SdkEvent): ServerMessage[] {
  switch (event.type) {
    case "message_update": {
      const sub = event.assistantMessageEvent;
      if (sub?.type === "text_delta" && sub.delta !== undefined) {
        return [{ type: "chat_delta", delta: sub.delta }];
      }
      return [];
    }

    case "agent_start":
      return [{ type: "agent_start" }];

    case "agent_end":
      return [{ type: "agent_end" }, { type: "chat_done" }];

    case "tool_execution_start":
      return [{ type: "tool_start", toolName: event.toolName ?? "unknown" }];

    case "tool_execution_end":
      return [{ type: "tool_end", result: String(event.result ?? "") }];

    case "tool_execution_update":
      return [{ type: "tool_update", output: String(event.partialResult ?? "") }];

    default:
      return [];
  }
}
