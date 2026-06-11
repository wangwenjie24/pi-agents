import { describe, it, expect } from "vitest";
import { getNextRetryDelay, resetRetryCount, type ReconnectState } from "./reconnect-strategy.js";

describe("reconnect-strategy", () => {
  describe("getNextRetryDelay", () => {
    it("首次重连延迟为 1 秒", () => {
      const state: ReconnectState = { attemptCount: 0 };
      const { delay, attemptCount } = getNextRetryDelay(state);
      expect(delay).toBe(1000);
      expect(attemptCount).toBe(1);
    });

    it("指数增长：1s → 2s → 4s → 8s → 16s", () => {
      let state: ReconnectState = { attemptCount: 0 };
      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(getNextRetryDelay(state).delay).toBe(2000);

      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(getNextRetryDelay(state).delay).toBe(4000);

      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(getNextRetryDelay(state).delay).toBe(8000);

      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(getNextRetryDelay(state).delay).toBe(16000);
    });

    it("延迟上限为 30 秒", () => {
      const state: ReconnectState = { attemptCount: 10 };
      const { delay } = getNextRetryDelay(state);
      expect(delay).toBe(30000);
    });

    it("多次调用后 attemptCount 递增", () => {
      let state: ReconnectState = { attemptCount: 0 };
      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(state.attemptCount).toBe(1);
      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(state.attemptCount).toBe(2);
      state = { attemptCount: getNextRetryDelay(state).attemptCount };
      expect(state.attemptCount).toBe(3);
    });
  });

  describe("resetRetryCount", () => {
    it("重置尝试计数为 0", () => {
      const state: ReconnectState = { attemptCount: 5 };
      const result = resetRetryCount(state);
      expect(result.attemptCount).toBe(0);
    });
  });
});
