import React, { useState, useRef, useCallback, DragEvent } from "react";
import { Send, StopCircle, X, Paperclip } from "lucide-react";

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
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  const canSend = input.trim().length > 0 && connected;

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setPendingFiles((prev) => [...prev, ...files]);
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length > 0) {
      e.preventDefault();
      setPendingFiles((prev) => [...prev, ...files]);
    }
    // 纯文本粘贴由浏览器默认行为处理
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSend) return;
      sendPrompt(input.trim());
      setInput("");
      setPendingFiles([]);
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
          setPendingFiles([]);
        }
      }
    },
    [canSend, input, sendPrompt]
  );

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {/* 文件预览区 */}
        {pendingFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {pendingFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5 text-xs"
              >
                <Paperclip size={12} className="flex-shrink-0 text-muted-foreground" />
                <span className="truncate max-w-[150px]">{file.name}</span>
                <button
                  data-testid={`remove-file-${idx}`}
                  onClick={() => removeFile(idx)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <form
          onSubmit={handleSubmit}
          data-testid="chat-input-drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex items-end gap-2 bg-muted rounded-2xl px-4 py-3 shadow-xs transition-all ${
            isDragOver ? "ring-2 ring-primary" : ""
          }`}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
