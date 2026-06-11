import React, { useState, useRef, useCallback } from "react";
import { Send, StopCircle } from "lucide-react";

interface ChatInputProps {
  connected: boolean;
  isRunning: boolean;
  sendPrompt: (text: string) => void;
  sendAbort: () => void;
}

export function ChatInput({
  connected,
  isRunning,
  sendPrompt,
  sendAbort,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = input.trim().length > 0 && connected;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSend) return;
      sendPrompt(input.trim());
      setInput("");
      textareaRef.current?.focus();
    },
    [canSend, input, sendPrompt]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (canSend) {
          sendPrompt(input.trim());
          setInput("");
        }
      }
    },
    [canSend, input, sendPrompt]
  );

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-muted rounded-2xl px-4 py-3 shadow-xs"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={!connected}
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none outline-none disabled:opacity-50"
            style={{ fieldSizing: "content", maxHeight: "200px" }}
          />
          {isRunning ? (
            <button
              type="button"
              onClick={sendAbort}
              aria-label="Cancel"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity"
            >
              <StopCircle size={16} className="animate-spin" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
            >
              <Send size={16} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
