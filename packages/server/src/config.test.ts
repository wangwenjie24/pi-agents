import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { WebSocket } from "ws";
import { createServer } from "./main.js";
import { applyConfig, type SessionContext } from "./config.js";

describe("config 消息处理", () => {
  const PORT = 9877;
  let stop: () => Promise<void>;

  beforeAll(async () => {
    const result = await createServer({ port: PORT, noSdk: true });
    stop = result.stop;
  });

  afterAll(async () => {
    await stop();
  });

  it("发送 config 消息后服务器不会崩溃", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    ws.send(
      JSON.stringify({
        type: "config",
        provider: "openai",
        model: "gpt-4",
        baseUrl: "https://api.openai.com/v1",
        apiKey: "sk-test-123",
      })
    );

    // 等待一小段时间确认连接仍然正常
    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });

  it("发送 config 消息后仍可正常发送 prompt", async () => {
    const ws = new WebSocket(`ws://localhost:${PORT}`);
    await new Promise<void>((resolve) => ws.on("open", resolve));

    // 先发送 config
    ws.send(
      JSON.stringify({
        type: "config",
        provider: "anthropic",
        model: "claude-3",
        baseUrl: "https://api.anthropic.com",
        apiKey: "sk-ant-test",
      })
    );

    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    // 再发送 prompt，连接应该仍然正常
    ws.send(JSON.stringify({ type: "prompt", text: "hello" }));

    await new Promise<void>((resolve) => setTimeout(resolve, 200));
    expect(ws.readyState).toBe(WebSocket.OPEN);

    ws.close();
  });
});

describe("applyConfig 纯函数", () => {
  it("按顺序调用 setRuntimeApiKey 和 setModel", () => {
    const calls: string[] = [];
    const ctx: SessionContext = {
      setRuntimeApiKey: (provider, apiKey) => {
        calls.push(`setRuntimeApiKey:${provider}:${apiKey}`);
      },
      setModel: (provider, modelId, baseUrl) => {
        calls.push(`setModel:${provider}:${modelId}:${baseUrl}`);
      },
    };

    applyConfig(ctx, {
      type: "config",
      provider: "openai",
      model: "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "sk-test-123",
    });

    expect(calls).toEqual([
      "setRuntimeApiKey:openai:sk-test-123",
      "setModel:openai:gpt-4o:https://api.openai.com/v1",
    ]);
  });

  it("使用 anthropic 配置时传递正确的参数", () => {
    const calls: string[] = [];
    const ctx: SessionContext = {
      setRuntimeApiKey: (provider, apiKey) => {
        calls.push(`apiKey:${provider}:${apiKey}`);
      },
      setModel: (provider, modelId, baseUrl) => {
        calls.push(`model:${provider}:${modelId}:${baseUrl}`);
      },
    };

    applyConfig(ctx, {
      type: "config",
      provider: "anthropic",
      model: "claude-sonnet-4",
      baseUrl: "https://api.anthropic.com",
      apiKey: "sk-ant-456",
    });

    expect(calls).toEqual([
      "apiKey:anthropic:sk-ant-456",
      "model:anthropic:claude-sonnet-4:https://api.anthropic.com",
    ]);
  });
});
