import React, { useState } from "react";
import { useChatStore } from "../chat-store.js";
import { Send } from "lucide-react";

export function WelcomePage() {
  const connected = useChatStore((s) => s.connected);
  const sendPrompt = useChatStore((s) => s.sendPrompt);
  const [input, setInput] = useState("");

  const canSend = input.trim().length > 0 && connected;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    sendPrompt(input.trim());
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        sendPrompt(input.trim());
        setInput("");
      }
    }
  };

  return (
    <div className="flex flex-col items-center h-full" style={{ marginTop: "25vh" }}>
      {/* 品牌 Logo + 名称 */}
      <div className="flex flex-col items-center mb-12">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
          <span className="text-primary-foreground text-lg font-semibold">P</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Pi Chat</h1>
      </div>

      {/* 输入区域 */}
      <div className="w-full max-w-2xl px-4">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-muted rounded-2xl px-4 py-3 shadow-xs"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={!connected}
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none disabled:opacity-50"
            style={{ fieldSizing: "content" }}
          />
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
