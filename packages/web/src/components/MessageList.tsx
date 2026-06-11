import React, { useRef, useEffect, useState, useCallback } from "react";
import { ChevronDown, Copy, Pencil, RefreshCw } from "lucide-react";
import { MarkdownContent } from "./MarkdownContent.js";
import { ToolCallCard } from "./ToolCallCard.js";
import type { ChatMessage } from "../chat-store.js";

interface MessageListProps {
  messages: ChatMessage[];
  isRunning: boolean;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
}

function ThinkingDots() {
  return (
    <div className="flex justify-start py-1">
      <div className="flex items-center gap-1 bg-muted rounded-2xl px-4 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            data-testid="thinking-dot"
            className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export function MessageList({ messages, isRunning, onEditMessage, onRegenerateMessage }: MessageListProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const checkIfAtBottom = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return true;
    // 容差 30px，避免浮点精度问题
    return el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
  }, []);

  // 监听滚动事件
  const handleScroll = useCallback(() => {
    setIsAtBottom(checkIfAtBottom());
  }, [checkIfAtBottom]);

  // 自动滚动到底部（仅在用户已处于底部时）
  useEffect(() => {
    if (isAtBottom) {
      scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isRunning, isAtBottom]);

  const scrollToBottom = useCallback(() => {
    setIsAtBottom(true);
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // 判断是否显示脉动圆点：
  // AI 正在思考 = isRunning 且最后一条消息不是 assistant（或者最后一条 assistant 消息还是空的）
  const lastMsg = messages[messages.length - 1];
  const showThinking =
    isRunning &&
    (lastMsg?.role !== "assistant" ||
      (lastMsg?.role === "assistant" && lastMsg.status === "streaming" && !lastMsg.content));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 relative" ref={scrollContainerRef} onScroll={handleScroll} data-testid="scroll-container">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group relative flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {/* 操作栏：hover 时渐显 */}
            <div
              data-testid={`msg-actions-${msg.id}`}
              className={`absolute -top-3 ${
                msg.role === "user" ? "right-0" : "left-0"
              } flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}
            >
              <button
                data-testid={`copy-btn-${msg.id}`}
                onClick={() => navigator.clipboard.writeText(msg.content)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label="复制"
              >
                <Copy size={14} />
              </button>
              {msg.role === "user" ? (
                <button
                  data-testid={`edit-btn-${msg.id}`}
                  onClick={() => {
                    setEditingId(msg.id);
                    setEditDraft(msg.content);
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="编辑"
                >
                  <Pencil size={14} />
                </button>
              ) : (
                <button
                  data-testid={`regenerate-btn-${msg.id}`}
                  onClick={() => onRegenerateMessage?.(msg.id)}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  aria-label="重新生成"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>
            {msg.role === "user" ? (
              /* 用户消息：右对齐、muted 背景、大圆角 */
              <div
                data-msg-bubble
                className="max-w-[75%] bg-muted rounded-3xl px-4 py-2.5 text-sm leading-relaxed text-foreground"
              >
                {editingId === msg.id ? (
                  /* 编辑模式 */
                  <textarea
                    data-testid={`edit-textarea-${msg.id}`}
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        onEditMessage?.(msg.id, editDraft);
                        setEditingId(null);
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                        setEditDraft("");
                      }
                    }}
                    className="w-full bg-transparent resize-none outline-none text-foreground"
                    style={{ fieldSizing: "content", maxHeight: "200px" }}
                    autoFocus
                  />
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.edited && (
                      <span className="inline-block mt-1 text-xs text-muted-foreground">✎ 已编辑</span>
                    )}
                  </>
                )}
                {msg.status === "aborted" && (
                  <span className="inline-block mt-1 text-xs text-muted-foreground">
                    ⏹ 已中断
                  </span>
                )}
              </div>
            ) : (
              /* AI 消息：无气泡，直接渲染 Markdown */
              <div
                data-msg-bubble
                className="max-w-[100%] text-sm leading-relaxed text-foreground"
              >
                {msg.content ? (
                  <MarkdownContent content={msg.content} />
                ) : null}
                {/* 工具调用展示 */}
                {msg.toolCalls && msg.toolCalls.length > 0 && (
                  <div className="mb-2 space-y-1.5">
                    {msg.toolCalls.map((tc, idx) => (
                      <ToolCallCard key={idx} toolCall={tc} />
                    ))}
                  </div>
                )}
                {msg.status === "aborted" && (
                  <span className="inline-block mt-1 text-xs text-muted-foreground">
                    ⏹ 已中断
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        {/* AI 思考时显示脉动圆点 */}
        {showThinking && <ThinkingDots />}

        {/* 滚动锚点 */}
        <div ref={scrollAnchorRef} data-testid="scroll-anchor" />
      </div>

      {/* 滚动到底部浮动按钮 */}
      {!isAtBottom && (
        <button
          data-testid="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          className="absolute bottom-4 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground shadow-md transition-opacity"
          aria-label="滚动到底部"
        >
          <ChevronDown size={16} />
        </button>
      )}
    </div>
  );
}
