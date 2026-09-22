import { describe, it, expect } from "vitest";
import { verify, factsFromData } from "../src/lib/ai/verify";

const facts = [
  { id: "confidence_pct", label: "confidence %", value: 85 },
  { id: "financial_impact", label: "financial impact ($)", value: 1250.5 },
];

describe("verify", () => {
  it("passes when every stated number is cited and matches its fact", () => {
    const result = verify(
      {
        text: "This has 85% confidence and an estimated $1,250.50 impact.",
        citations: [
          { factId: "confidence_pct", value: 85 },
          { factId: "financial_impact", value: 1250.5 },
        ],
      },
      facts,
    );
    expect(result).toEqual({ ok: true });
  });

  it("fails when a citation's value doesn't match the real fact", () => {
    const result = verify(
      { text: "Confidence is 95%.", citations: [{ factId: "confidence_pct", value: 95 }] },
      facts,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations[0]).toMatch(/real value is 85/);
  });

  it("fails when citing a fact id that doesn't exist", () => {
    const result = verify(
      { text: "It scores 40.", citations: [{ factId: "made_up_fact", value: 40 }] },
      facts,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations[0]).toMatch(/unknown fact id/);
  });

  it("fails when a number in the prose has no citation at all", () => {
    const result = verify(
      { text: "This will grow revenue by 30%.", citations: [{ factId: "confidence_pct", value: 85 }] },
      facts,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations.some((v) => v.includes("no matching citation"))).toBe(true);
  });

  it("tolerates rounding within 1%", () => {
    const result = verify(
      { text: "Impact is $1,250.49.", citations: [{ factId: "financial_impact", value: 1250.49 }] },
      facts,
    );
    expect(result).toEqual({ ok: true });
  });
});

describe("factsFromData", () => {
  it("flattens numbers at the top level", () => {
    expect(factsFromData({ adSpend: 500, clicks: 12 })).toEqual([
      { id: "data.adSpend", label: "adSpend", value: 500 },
      { id: "data.clicks", label: "clicks", value: 12 },
    ]);
  });

  it("flattens nested objects and skips non-numeric values", () => {
    expect(factsFromData({ store: { name: "Acme", revenue: 999 }, note: "hi" })).toEqual([
      { id: "data.store.revenue", label: "revenue", value: 999 },
    ]);
  });
});
