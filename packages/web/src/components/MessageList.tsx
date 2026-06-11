import React, { useRef, useEffect } from "react";
import { MarkdownContent } from "./MarkdownContent.js";
import type { ChatMessage } from "../chat-store.js";

interface MessageListProps {
  messages: ChatMessage[];
  isRunning: boolean;
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

export function MessageList({ messages, isRunning }: MessageListProps) {
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRunning]);

  // 判断是否显示脉动圆点：
  // AI 正在思考 = isRunning 且最后一条消息不是 assistant（或者最后一条 assistant 消息还是空的）
  const lastMsg = messages[messages.length - 1];
  const showThinking =
    isRunning &&
    (lastMsg?.role !== "assistant" ||
      (lastMsg?.role === "assistant" && lastMsg.status === "streaming" && !lastMsg.content));

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {msg.role === "user" ? (
              /* 用户消息：右对齐、muted 背景、大圆角 */
              <div
                data-msg-bubble
                className="max-w-[75%] bg-muted rounded-3xl px-4 py-2.5 text-sm leading-relaxed text-foreground"
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
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
                      <div
                        key={idx}
                        className="flex items-start gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border text-xs"
                      >
                        <span
                          className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            tc.status === "running"
                              ? "bg-foreground/40 animate-pulse"
                              : "bg-foreground"
                          }`}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium">{tc.toolName}</span>
                          {tc.status === "running" && (
                            <span className="ml-1.5 text-muted-foreground">执行中…</span>
                          )}
                          {tc.output && (
                            <p className="mt-0.5 text-muted-foreground truncate">{tc.output}</p>
                          )}
                          {tc.result && (
                            <p className="mt-0.5 text-foreground/70 line-clamp-2">{tc.result}</p>
                          )}
                        </div>
                      </div>
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
    </div>
  );
}
