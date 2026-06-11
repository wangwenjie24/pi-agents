import React, { useEffect } from "react";
import { useChatStore } from "./chat-store.js";
import { ChatRuntimeProvider } from "./ChatRuntimeProvider.js";
import { Sidebar } from "./components/Sidebar.js";
import { WelcomePage } from "./components/WelcomePage.js";
import { MessageList } from "./components/MessageList.js";
import { ChatInput } from "./components/ChatInput.js";
import { TopNavBar } from "./components/TopNavBar.js";
import { useThemeStore } from "./theme-store.js";
import { Toaster } from "sonner";

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
    <div className="flex flex-col h-full">
      {hasMessages && <TopNavBar />}
      <div className="flex flex-col flex-1 min-h-0 bg-background text-foreground">
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
    </div>
  );
}

export function App() {
  // 初始化主题（从 localStorage 恢复）
  const initTheme = useThemeStore((s) => s.initFromStorage);
  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <ChatRuntimeProvider>
      <div
        className="grid h-screen overflow-hidden bg-background"
        style={{ gridTemplateColumns: "auto 1fr 0fr" }}
        data-testid="app-grid"
      >
        <Sidebar />
        <main className="min-w-0 overflow-hidden">
          <ChatInner />
        </main>
        {/* 右侧面板占位 - 0fr 默认折叠，后续切片可扩展 */}
        <div className="overflow-hidden" />
      </div>
      <Toaster position="bottom-center" duration={5000} />
    </ChatRuntimeProvider>
  );
}
