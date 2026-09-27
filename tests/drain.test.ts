import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/jobs/boss", () => ({ getBoss: vi.fn(), QUEUES: { syncStore: "sync-store" } }));
vi.mock("@/lib/jobs/handlers", () => ({ handleSyncStore: vi.fn() }));
vi.mock("@/lib/alerts", () => ({ reportError: vi.fn() }));

const { shouldContinue } = await import("../src/lib/jobs/drain");

describe("shouldContinue", () => {
  it("hands off when work is left and this run made progress", () => {
    expect(shouldContinue({ processed: 2, more: true })).toBe(true);
  });
  it("stops once the queue is empty", () => {
    expect(shouldContinue({ processed: 3, more: false })).toBe(false);
  });
  it("stops when a run makes no progress, so a failing job can't loop forever", () => {
    expect(shouldContinue({ processed: 0, more: true })).toBe(false);
  });
});
