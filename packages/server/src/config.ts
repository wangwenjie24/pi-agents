import type { ConfigMessage } from "@pi-chat/shared";

/**
 * 会话上下文接口 — 封装 PI SDK 中与配置注入相关的方法。
 * 测试时可通过 mock 实现，生产环境传入真实的 SDK 对象。
 */
export interface SessionContext {
  /** 注入运行时 API key（仅内存，不持久化） */
  setRuntimeApiKey: (provider: string, apiKey: string) => void;
  /** 设置模型（provider、model id、base URL） */
  setModel: (provider: string, model: string, baseUrl: string) => void;
}

/**
 * 将用户配置注入到会话上下文中。
 * 纯函数：按顺序调用 setRuntimeApiKey → setModel。
 */
export function applyConfig(ctx: SessionContext, msg: ConfigMessage): void {
  ctx.setRuntimeApiKey(msg.provider, msg.apiKey);
  ctx.setModel(msg.provider, msg.model, msg.baseUrl);
}
