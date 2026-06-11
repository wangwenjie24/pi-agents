import {
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useChatStore, type ChatMessage } from "./chat-store.js";
import React from "react";

function toThreadMessageLike(msg: ChatMessage): ThreadMessageLike {
  if (msg.role === "assistant" && msg.toolCalls && msg.toolCalls.length > 0) {
    // 将 toolCalls 映射为 assistant-ui 的 content parts
    const toolParts = msg.toolCalls.map((tc, idx) => ({
      type: "tool-call" as const,
      toolName: tc.toolName,
      toolCallId: `tc-${tc.toolName}-${idx}`,
      args: {},
      argsText: "",
      ...(tc.result !== undefined ? { result: tc.result } : {}),
    }));

    const textParts = msg.content
      ? [{ type: "text" as const, text: msg.content }]
      : [];

    return {
      role: "assistant",
      content: [...toolParts, ...textParts],
    };
  }

  return {
    role: msg.role === "user" ? "user" : "assistant",
    content: [{ type: "text", text: msg.content }],
  };
}

function ChatRuntimeProvider({ children }: { children: React.ReactNode }) {
  const messages = useChatStore((s) => s.messages);
  const isRunning = useChatStore((s) => s.isRunning);
  const sendPrompt = useChatStore((s) => s.sendPrompt);

  const runtime = useExternalStoreRuntime({
    isRunning,
    messages,
    convertMessage: (msg: ChatMessage) => toThreadMessageLike(msg),
    onNew: async (message: AppendMessage) => {
      const text = message.content[0]?.type === "text" ? message.content[0].text : "";
      if (text) {
        sendPrompt(text);
      }
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}

export { ChatRuntimeProvider };
