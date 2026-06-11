import React from "react";
import { useChatStore } from "../chat-store.js";

const STATUS_CONFIG = {
  connected: {
    label: "已连接",
    className: "bg-foreground/5 text-foreground/70 border-border",
  },
  connecting: {
    label: "连接中…",
    className: "bg-foreground/5 text-muted-foreground border-border animate-pulse",
  },
  reconnecting: {
    label: "重连中…",
    className: "bg-foreground/5 text-muted-foreground border-border animate-pulse",
  },
  disconnected: {
    label: "未连接",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
} as const;

export function ConnectionStatusBar() {
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[connectionStatus];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      <span>{config.label}</span>
    </div>
  );
}
