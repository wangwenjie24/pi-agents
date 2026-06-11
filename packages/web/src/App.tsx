import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "./chat-store.js";
import { useConfigStore } from "./config-store.js";
import { ChatRuntimeProvider } from "./ChatRuntimeProvider.js";
import { Sidebar } from "./components/Sidebar.js";
import { SettingsPanel } from "./components/SettingsPanel.js";
import { ConnectionStatusBar } from "./components/ConnectionStatusBar.js";

function ChatInner() {
  const connected = useChatStore((s) => s.connected);
  const isRunning = useChatStore((s) => s.isRunning);
  const messages = useChatStore((s) => s.messages);
  const activeSessionId = useChatStore((s) => s.activeSessionId);
  const provider = useConfigStore((s) => s.provider);
  const model = useConfigStore((s) => s.model);
  const [showSettings, setShowSettings] = useState(false);

  // 显示当前模型信息
  const modelInfo = provider && model ? `${provider}/${model}` : "";

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-semibold">
          Pi Chat
          {activeSessionId && (
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {activeSessionId.slice(0, 8)}…
            </span>
          )}
        </h1>
        <div className="flex items-center gap-3">
          {modelInfo && (
            <span className="text-xs text-zinc-500">{modelInfo}</span>
          )}
          <button
            onClick={() => setShowSettings(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="模型配置"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="2.5" />
              <path d="M13.3 10a1.2 1.2 0 00.2 1.3l.1.1a1.45 1.45 0 11-2.05 2.05l-.1-.1a1.2 1.2 0 00-1.3-.2 1.2 1.2 0 00-.73 1.1v.3a1.45 1.45 0 11-2.9 0v-.15a1.2 1.2 0 00-.79-1.1 1.2 1.2 0 00-1.3.2l-.1.1a1.45 1.45 0 11-2.05-2.05l.1-.1a1.2 1.2 0 00.2-1.3 1.2 1.2 0 00-1.1-.73h-.3a1.45 1.45 0 110-2.9h.15a1.2 1.2 0 001.1-.79 1.2 1.2 0 00-.2-1.3l-.1-.1A1.45 1.45 0 114.55 2.6l.1.1a1.2 1.2 0 001.3.2h.06a1.2 1.2 0 00.73-1.1v-.3a1.45 1.45 0 012.9 0v.15a1.2 1.2 0 00.73 1.1 1.2 1.2 0 001.3-.2l.1-.1a1.45 1.45 0 112.05 2.05l-.1.1a1.2 1.2 0 00-.2 1.3v.06a1.2 1.2 0 001.1.73h.3a1.45 1.45 0 010 2.9h-.15a1.2 1.2 0 00-1.1.73z" />
            </svg>
          </button>
          <ConnectionStatusBar />
        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content || "…"}</p>
            </div>
          </div>
        ))}
        {isRunning && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-2.5 text-sm text-zinc-400">
              Agent 正在思考…
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const input = form.querySelector("input")!;
            const text = input.value.trim();
            if (!text || !connected) return;
            useChatStore.getState().sendPrompt(text);
            input.value = "";
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder={connected ? "输入消息…" : "正在连接…"}
            disabled={!connected}
            className="flex-1 rounded-xl bg-zinc-800 border border-zinc-700 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!connected || isRunning}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ChatRuntimeProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0">
          <ChatInner />
        </main>
      </div>
    </ChatRuntimeProvider>
  );
}
