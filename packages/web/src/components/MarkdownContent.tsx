import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter/dist/esm/index.js";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism/one-light.js";
import { Copy, Check } from "lucide-react";

interface MarkdownContentProps {
  content: string;
}

function CodeBlock({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }) {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : null;
  const code = String(children).replace(/\n$/, "");

  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  if (!language) {
    // 行内代码
    return (
      <code
        className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono"
        {...rest}
      >
        {children}
      </code>
    );
  }

  // 代码块
  return (
    <div className="relative group my-3 rounded-lg overflow-hidden border border-border">
      {/* 语言标签 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border text-xs text-muted-foreground">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          aria-label="复制代码"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneLight}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: "0.8125rem",
          lineHeight: 1.6,
          padding: "1rem",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="prose-sm max-w-none text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock as any,
          a: ({ href, children, ...rest }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline text-foreground hover:text-foreground/80"
              {...rest}
            >
              {children}
            </a>
          ),
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
