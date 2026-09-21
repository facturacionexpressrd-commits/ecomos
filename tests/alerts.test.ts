import { describe, it, expect } from "vitest";
import { redact, shouldSend } from "../src/lib/alerts";

describe("redact", () => {
  it("removes tokens from query strings and bearer headers", () => {
    expect(redact("GET /me?access_token=EAAB123456789abcdef&x=1 failed")).not.toContain("EAAB123456789abcdef");
    expect(redact("Authorization: Bearer abc.def-ghi_123")).toBe("Authorization: Bearer [redacted]");
  });
  it("removes provider-shaped keys and database urls", () => {
    expect(redact("bad key shpat_0123456789abcdef0123")).not.toContain("shpat_0123456789abcdef0123");
    expect(redact("sk-ant-api03-abcdefghijklmnop")).toBe("[redacted]");
    expect(redact("connect postgresql://user:pw@host:6543/db failed")).toBe("connect [redacted-db-url] failed");
  });
  it("leaves ordinary messages alone", () => {
    expect(redact("Campaign not found")).toBe("Campaign not found");
  });
});

describe("shouldSend", () => {
  it("sends once, then suppresses identical alerts for ten minutes", () => {
    const seen = new Map<string, number>();
    expect(shouldSend("a", 0, seen)).toBe(true);
    expect(shouldSend("a", 60_000, seen)).toBe(false);
    expect(shouldSend("a", 10 * 60_000 + 1, seen)).toBe(true);
  });
  it("treats different alerts independently", () => {
    const seen = new Map<string, number>();
    shouldSend("a", 0, seen);
    expect(shouldSend("b", 1, seen)).toBe(true);
  });
});
