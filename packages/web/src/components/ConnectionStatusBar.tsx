import React from "react";
import { useChatStore } from "./chat-store.js";

const STATUS_CONFIG = {
  connected: {
    icon: "●",
    label: "已连接",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    dotClassName: "text-emerald-400",
  },
  connecting: {
    icon: "●",
    label: "连接中…",
    className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    dotClassName: "text-yellow-400 animate-pulse",
  },
  reconnecting: {
    icon: "●",
    label: "重连中…",
    className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    dotClassName: "text-orange-400 animate-pulse",
  },
  disconnected: {
    icon: "○",
    label: "未连接",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
    dotClassName: "text-red-400",
  },
} as const;

export function ConnectionStatusBar() {
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const config = STATUS_CONFIG[connectionStatus];

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.className}`}
    >
      <span className={config.dotClassName}>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
