import { describe, it, expect, beforeAll } from "vitest";

/**
 * 切片 1 测试：设计系统基础
 *
 * 验证 CSS 变量 token 系统、Tailwind 映射、字体加载和滚动条样式。
 * 这些测试通过读取编译后的 CSS 来验证 token 定义是否正确。
 */

describe("设计系统基础：CSS 变量 token", () => {
  let cssContent: string;

  beforeAll(async () => {
    // 读取 index.css 源文件
    const fs = await import("fs");
    const path = await import("path");
    const cssPath = path.resolve(__dirname, "./index.css");
    cssContent = fs.readFileSync(cssPath, "utf-8");
  });

  describe("OKLCH 色彩变量", () => {
    it("在 :root 中定义了所有核心颜色 token，使用 OKLCH 色彩空间", () => {
      // 验证 :root 块存在
      expect(cssContent).toContain(":root");

      // 核心颜色角色
      const requiredTokens = [
        "--color-background",
        "--color-foreground",
        "--color-primary",
        "--color-primary-foreground",
        "--color-secondary",
        "--color-secondary-foreground",
        "--color-muted",
        "--color-muted-foreground",
        "--color-accent",
        "--color-accent-foreground",
        "--color-border",
        "--color-input",
        "--color-ring",
        "--color-sidebar",
        "--color-sidebar-border",
        "--color-destructive",
      ];

      for (const token of requiredTokens) {
        expect(cssContent, `缺少 token: ${token}`).toContain(token);
      }
    });

    it("所有非 destructive 的 token 色度为 0（纯中性色）", () => {
      // 在 :root 块中提取 oklch 值，验证 C 通道为 0
      const rootBlock = cssContent.match(/:root\s*\{[^}]+\}/s)?.[0];
      expect(rootBlock).toBeDefined();

      // 匹配所有 oklch() 值（排除 destructive）
      const oklchMatches = rootBlock!.matchAll(
        /--color-(?!destructive)[\w-]+:\s*oklch\(([^)]+)\)/g
      );

      for (const match of oklchMatches) {
        const value = match[1];
        // oklch(L C H) - 第二个值应该是 0 或 0.x 且为 0
        const parts = value.trim().split(/\s+/);
        if (parts.length >= 2) {
          const chroma = parseFloat(parts[1]);
          expect(
            chroma,
            `${match[0]} 的色度应为 0，实际为 ${chroma}`
          ).toBe(0);
        }
      }
    });

    it("destructive token 使用饱和色（色度不为 0）", () => {
      const rootBlock = cssContent.match(/:root\s*\{[^}]+\}/s)?.[0];
      expect(rootBlock).toBeDefined();

      const destructiveMatch = rootBlock!.match(
        /--color-destructive:\s*oklch\(([^)]+)\)/
      );
      expect(destructiveMatch).toBeDefined();

      const parts = destructiveMatch![1].trim().split(/\s+/);
      const chroma = parseFloat(parts[1]);
      expect(chroma, "destructive 应使用饱和色").toBeGreaterThan(0);
    });
  });

  describe("Tailwind @theme inline 映射", () => {
    it("通过 @theme inline 将 CSS 变量映射为 Tailwind utility class", () => {
      expect(cssContent).toContain("@theme inline");

      // 验证关键颜色映射
      const themeMappings = [
        "--color-background:",
        "--color-foreground:",
        "--color-primary:",
        "--color-muted:",
        "--color-border:",
      ];

      // @theme inline 块
      const themeBlock = cssContent.match(/@theme inline\s*\{[^}]+\}/s)?.[0];
      expect(themeBlock).toBeDefined();

      for (const mapping of themeMappings) {
        expect(
          themeBlock!,
          `@theme 中缺少映射: ${mapping}`
        ).toContain(mapping);
      }
    });
  });

  describe("圆角分级", () => {
    it("定义了 sm/md/lg/xl/full 五级圆角", () => {
      const requiredRadius = [
        "--radius-sm",
        "--radius-md",
        "--radius-lg",
        "--radius-xl",
        "--radius-full",
      ];

      for (const r of requiredRadius) {
        expect(cssContent, `缺少圆角变量: ${r}`).toContain(r);
      }

      // 验证值
      expect(cssContent).toContain("--radius-sm: 6px");
      expect(cssContent).toContain("--radius-md: 8px");
      expect(cssContent).toContain("--radius-lg: 10px");
      expect(cssContent).toContain("--radius-xl: 16px");
      expect(cssContent).toContain("--radius-full: 9999px");
    });
  });

  describe("自定义滚动条", () => {
    it("全局定义了 6px 宽、圆角、灰色 thumb 的自定义滚动条样式", () => {
      // 验证 webkit scrollbar 样式
      expect(cssContent).toContain("::-webkit-scrollbar");
      expect(cssContent).toContain("::-webkit-scrollbar-thumb");
      expect(cssContent).toContain("::-webkit-scrollbar-track");

      // 宽度 6px (通过 width 或相关属性)
      expect(cssContent).toMatch(/scrollbar.*width.*6px|width.*6px.*scrollbar|::-webkit-scrollbar\s*\{[^}]*width:\s*6px/s);
    });
  });

  describe("Inter 字体", () => {
    it("从 Google Fonts 加载 Inter 字体", () => {
      const fs = require("fs");
      const path = require("path");
      const htmlPath = path.resolve(__dirname, "../index.html");
      const htmlContent = fs.readFileSync(htmlPath, "utf-8");

      // index.html 应包含 Google Fonts 的 Inter 引入
      expect(htmlContent).toContain("fonts.googleapis.com");
      expect(htmlContent).toContain("Inter");
      expect(htmlContent).toContain("swap"); // font-display: swap
    });
  });
});
