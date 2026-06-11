import React, { useState } from "react";
import type { ToolCall } from "../chat-store.js";

interface ToolCallCardProps {
  toolCall: ToolCall;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
  const { toolName, status, output, result } = toolCall;

  // running 状态默认展开
  const [expanded, setExpanded] = useState(status === "running");

  const toggleExpand = () => setExpanded((prev) => !prev);

  const statusLabel = status === "running" ? "执行中" : "已完成";

  return (
    <div
      data-testid="tool-call-card"
      className="rounded-lg border border-border bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
      onClick={toggleExpand}
    >
      {/* 卡片头部：工具名 + 状态 */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span
          data-testid="tool-status-dot"
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            status === "running"
              ? "bg-foreground/40 animate-pulse"
              : "bg-foreground/70"
          }`}
        />
        <span className="text-sm font-medium text-foreground">{toolName}</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {statusLabel}
        </span>
        {/* 展开/折叠箭头 */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </div>

      {/* 展开后的详情表格 */}
      {expanded && (
        <div data-testid="tool-detail-table" className="border-t border-border px-3 py-2">
          <table className="w-full text-xs">
            <tbody>
              {output && (
                <tr>
                  <td className="py-1 pr-3 text-muted-foreground font-medium align-top whitespace-nowrap">
                    输出
                  </td>
                  <td className="py-1 text-foreground/80">
                    <pre className="whitespace-pre-wrap break-all">{output}</pre>
                  </td>
                </tr>
              )}
              {result && (
                <tr>
                  <td className="py-1 pr-3 text-muted-foreground font-medium align-top whitespace-nowrap">
                    结果
                  </td>
                  <td className="py-1 text-foreground/80">
                    <pre className="whitespace-pre-wrap break-all">{result}</pre>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
