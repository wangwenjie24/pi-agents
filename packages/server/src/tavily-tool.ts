import { Type } from "@sinclair/typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";

export interface TavilySearchOptions {
  apiKey?: string;
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * 创建 Tavily 搜索工具定义，通过 PI SDK 的 defineTool 注册。
 *
 * 工具在 Agent 对话中自动判断何时需要搜索联网信息，
 * 调用 Tavily Search API 后将结果整合到回复中。
 */
export function createTavilyTool(options: TavilySearchOptions = {}) {
  const apiKey = options.apiKey ?? process.env.TAVILY_API_KEY ?? "";

  return defineTool({
    name: "tavily_search",
    label: "Tavily Search",
    description:
      "搜索互联网获取最新信息。当用户提问需要最新数据、实时信息或你不确定的事实性问题时，使用此工具搜索。",
    parameters: Type.Object({
      query: Type.String({ description: "搜索查询关键词" }),
    }),
    async execute(
      _toolCallId: string,
      params: { query: string },
      signal: AbortSignal,
    ) {
      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            api_key: apiKey,
            query: params.query,
            search_depth: "basic",
            include_answer: false,
            max_results: 5,
          }),
          signal,
        });

        if (!response.ok) {
          const errorBody = await response.text();
          return {
            content: [
              {
                type: "text" as const,
                text: `搜索失败: HTTP ${response.status} - ${errorBody}`,
              },
            ],
            details: { error: true, status: response.status },
          };
        }

        const data = (await response.json()) as {
          results: TavilySearchResult[];
        };
        const results = data.results ?? [];

        // 将搜索结果格式化为可读文本
        const formattedResults = results
          .map(
            (r, i) =>
              `${i + 1}. **${r.title}**\n   URL: ${r.url}\n   ${r.content}`,
          )
          .join("\n\n");

        const text = results.length > 0
          ? `搜索结果（"${params.query}"）:\n\n${formattedResults}`
          : `未找到 "${params.query}" 的相关结果`;

        return {
          content: [{ type: "text" as const, text }],
          details: { query: params.query, resultCount: results.length },
        };
      } catch (err: any) {
        if (err.name === "AbortError") {
          return {
            content: [{ type: "text" as const, text: "搜索已被中断" }],
            details: { aborted: true },
          };
        }
        return {
          content: [
            {
              type: "text" as const,
              text: `搜索失败: ${err.message ?? String(err)}`,
            },
          ],
          details: { error: true },
        };
      }
    },
  });
}
