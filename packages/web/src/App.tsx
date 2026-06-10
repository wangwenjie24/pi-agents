import React, { useEffect, useRef, useState } from "react";
import { useChatStore } from "./chat-store.js";
import { ChatRuntimeProvider } from "./ChatRuntimeProvider.js";
import { ThreadPrimitive, ComposerPrimitive } from "@assistant-ui/react";

const WS_URL = "ws://localhost:8080";

function ChatInner() {
  const connect = useChatStore((s) => s.connect);
  const connected = useChatStore((s) => s.connected);
  const isRunning = useChatStore((s) => s.isRunning);
  const messages = useChatStore((s) => s.messages);

  useEffect(() => {
    connect(WS_URL);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h1 className="text-lg font-semibold">Pi Chat</h1>
        <span className={`text-sm ${connected ? "text-emerald-400" : "text-red-400"}`}>
          {connected ? "● 已连接" : "○ 未连接"}
        </span>
      </div>

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
      <ChatInner />
    </ChatRuntimeProvider>
  );
}
