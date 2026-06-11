import React from "react";
import { useChatStore } from "./chat-store.js";
import { useConfigStore } from "./config-store.js";
import { ChatRuntimeProvider } from "./ChatRuntimeProvider.js";
import { Sidebar } from "./components/Sidebar.js";
import { WelcomePage } from "./components/WelcomePage.js";
import { MessageList } from "./components/MessageList.js";
import { ChatInput } from "./components/ChatInput.js";

function ChatInner() {
  const connected = useChatStore((s) => s.connected);
  const isRunning = useChatStore((s) => s.isRunning);
  const messages = useChatStore((s) => s.messages);
  const sendPrompt = useChatStore((s) => s.sendPrompt);
  const sendAbort = useChatStore((s) => s.sendAbort);
  const editMessage = useChatStore((s) => s.editMessage);
  const regenerateMessage = useChatStore((s) => s.regenerateMessage);

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {hasMessages ? (
        <>
          {/* 消息列表 */}
          <MessageList
            messages={messages}
            isRunning={isRunning}
            onEditMessage={(id, content) => editMessage(id, content)}
            onRegenerateMessage={(id) => regenerateMessage(id)}
          />

          {/* 输入区域 */}
          <ChatInput
            connected={connected}
            isRunning={isRunning}
            sendPrompt={sendPrompt}
            sendAbort={sendAbort}
          />
        </>
      ) : (
        /* 欢迎页 */
        <WelcomePage />
      )}
    </div>
  );
}

export function App() {
  return (
    <ChatRuntimeProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <ChatInner />
        </main>
      </div>
    </ChatRuntimeProvider>
  );
}
