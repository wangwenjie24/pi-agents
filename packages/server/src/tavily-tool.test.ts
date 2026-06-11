import { describe, it, expect } from "vitest";
import { createTavilyTool } from "./tavily-tool.js";

/**
 * 测试 Tavily 搜索工具的创建和行为。
 *
 * 通过公共接口验证：
 * - 工具定义是否符合 PI SDK defineTool 的 shape
 * - execute 函数是否正确调用 Tavily API 并返回结构化结果
 */
describe("createTavilyTool", () => {
  it("返回包含正确 name 和 description 的工具定义", () => {
    const tool = createTavilyTool();

    expect(tool.name).toBe("tavily_search");
    expect(tool.label).toBe("Tavily Search");
    expect(tool.description).toContain("搜索");
  });

  it("execute 调用 Tavily API 并返回搜索结果", async () => {
    // 模拟 Tavily API 响应
    const mockResults = [
      {
        title: "Test Result",
        url: "https://example.com",
        content: "Test content",
        score: 0.95,
      },
    ];

    // 用 fetch mock 模拟 API 调用
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("tavily.com")) {
        return new Response(
          JSON.stringify({ results: mockResults }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(url, init);
    };

    try {
      const tool = createTavilyTool({ apiKey: "tvly-test-key" });
      const result = await tool.execute(
        "call-1",
        { query: "test query" },
        new AbortController().signal,
      );

      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe("text");

      const text = result.content[0].text as string;
      expect(text).toContain("Test Result");
      expect(text).toContain("https://example.com");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("API 返回错误时返回友好的错误消息", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === "string" ? url : url.toString();
      if (urlStr.includes("tavily.com")) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(url, init);
    };

    try {
      const tool = createTavilyTool({ apiKey: "bad-key" });
      const result = await tool.execute(
        "call-2",
        { query: "test" },
        new AbortController().signal,
      );

      expect(result.content[0].type).toBe("text");
      const text = result.content[0].text as string;
      expect(text).toContain("搜索失败");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("使用环境变量 TAVILY_API_KEY 作为默认 API key", () => {
    const originalEnv = process.env.TAVILY_API_KEY;
    process.env.TAVILY_API_KEY = "env-key";

    try {
      const tool = createTavilyTool();
      // 工具应成功创建，不抛出异常
      expect(tool.name).toBe("tavily_search");
    } finally {
      if (originalEnv) {
        process.env.TAVILY_API_KEY = originalEnv;
      } else {
        delete process.env.TAVILY_API_KEY;
      }
    }
  });
});
