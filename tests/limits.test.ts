import { describe, it, expect } from "vitest";
import { exceeded } from "../src/lib/limits";

const L = { perMinute: 5, perDay: 100 };

describe("exceeded", () => {
  it("allows usage under both limits", () => {
    expect(exceeded({ lastMinute: 4, lastDay: 99 }, L)).toBeNull();
  });
  it("blocks at the per-minute limit and says to retry in a minute", () => {
    expect(exceeded({ lastMinute: 5, lastDay: 5 }, L)).toEqual({ retryAfterSeconds: 60 });
  });
  it("blocks at the daily limit with a longer retry", () => {
    expect(exceeded({ lastMinute: 0, lastDay: 100 }, L)).toEqual({ retryAfterSeconds: 3600 });
  });
  it("reports the short wait when both are exceeded", () => {
    expect(exceeded({ lastMinute: 9, lastDay: 500 }, L)).toEqual({ retryAfterSeconds: 60 });
  });
});
