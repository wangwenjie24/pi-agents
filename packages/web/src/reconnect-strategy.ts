// ── 重连策略：指数退避 ──

const BASE_DELAY = 1000; // 1 秒
const MAX_DELAY = 30000; // 30 秒

export interface ReconnectState {
  attemptCount: number;
}

/**
 * 根据当前重连状态计算下次重连的延迟时间。
 * 使用指数退避：delay = min(BASE_DELAY * 2^attemptCount, MAX_DELAY)
 */
export function getNextRetryDelay(state: ReconnectState): {
  delay: number;
  attemptCount: number;
} {
  const nextCount = state.attemptCount + 1;
  const delay = Math.min(BASE_DELAY * Math.pow(2, state.attemptCount), MAX_DELAY);
  return { delay, attemptCount: nextCount };
}

/**
 * 重置重连尝试计数（连接成功时调用）
 */
export function resetRetryCount(_state: ReconnectState): ReconnectState {
  return { attemptCount: 0 };
}
