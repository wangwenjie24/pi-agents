import React from "react";
import { useChatStore } from "../chat-store.js";

export function TopNavBar() {
  const createSession = useChatStore((s) => s.createSession);
  const switchSession = useChatStore((s) => s.switchSession);

  const handleNewChat = async () => {
    const session = await createSession();
    switchSession(session.id);
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-b border-border bg-background"
      data-testid="top-navbar"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-semibold">P</span>
        </div>
        <span className="text-sm font-medium text-foreground">Pi Chat</span>
      </div>

      <button
        onClick={handleNewChat}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        title="新建对话"
        aria-label="新建对话"
      >
        {/* Pencil icon (Lucide) */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>
  );
}
