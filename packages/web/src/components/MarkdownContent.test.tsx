import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import React from "react";
import { MarkdownContent } from "./MarkdownContent.js";

/**
 * 切片 3 测试：Markdown 渲染
 *
 * 行为：
 * - 渲染普通文本
 * - 渲染 Markdown 格式（加粗、链接、代码块等）
 * - 代码块有语言标签和复制按钮
 * - 链接可点击，加粗 + 下划线
 */

describe("MarkdownContent 组件", () => {
  afterEach(() => {
    cleanup();
  });
  it("渲染普通文本", () => {
    render(<MarkdownContent content="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("渲染 Markdown 加粗文本", () => {
    render(<MarkdownContent content="This is **bold** text" />);
    const boldEl = screen.getByText("bold");
    expect(boldEl.tagName).toBe("STRONG");
  });

  it("渲染链接，加粗 + 下划线", () => {
    render(<MarkdownContent content="[click here](https://example.com)" />);
    const link = screen.getByText("click here");
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "https://example.com");
    // 链接应该有加粗和下划线样式
    expect(link.className).toMatch(/font-bold|font-semibold/);
    expect(link.className).toMatch(/underline/);
  });

  it("渲染行内代码", () => {
    render(<MarkdownContent content="Use `console.log` to debug" />);
    const code = screen.getByText("console.log");
    expect(code.tagName).toBe("CODE");
  });

  it("代码块有语言标签", () => {
    render(
      <MarkdownContent
        content={"```typescript\nconst x = 1;\n```"}
      />
    );
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("代码块有复制按钮", () => {
    render(
      <MarkdownContent
        content={"```js\nconsole.log('hello');\n```"}
      />
    );
    expect(screen.getByLabelText(/copy|复制/i)).toBeInTheDocument();
  });

  it("渲染表格（GFM）", () => {
    const tableMarkdown = `| Name | Age |
|------|-----|
| Alice | 30 |
| Bob | 25 |`;

    render(<MarkdownContent content={tableMarkdown} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("渲染删除线（GFM）", () => {
    render(<MarkdownContent content="This is ~~deleted~~ text" />);
    const del = screen.getByText("deleted");
    expect(del.tagName).toBe("DEL");
  });
});
