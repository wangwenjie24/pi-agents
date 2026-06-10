import {
  useExternalStoreRuntime,
  type ThreadMessageLike,
  type AppendMessage,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import { useChatStore, type ChatMessage } from "./chat-store.js";
import React from "react";

/** 将我们的 ChatMessage 转换为 assistant-ui 的 ThreadMessageLike */
function toThreadMessageLike(msg: ChatMessage): ThreadMessageLike {
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
