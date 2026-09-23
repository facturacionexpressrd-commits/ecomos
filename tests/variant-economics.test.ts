import { describe, it, expect } from "vitest";
import { variantEconomics, totalEconomics } from "../src/lib/finance/variant-economics";

describe("variantEconomics", () => {
  it("uses the variant's own sales: revenue − refunds − fees on pre-refund revenue − unit cost × units", () => {
    const e = variantEconomics({ unitsSold: 10, revenue: 300, refunds: 30 }, 12.5, 2.9);
    expect(e.fees).toBe(8.7); // 2.9% of 300, not of 270
    expect(e.cogs).toBe(125);
    expect(e.profit).toBe(136.3); // 300 − 30 − 8.7 − 125
    expect(e.margin).toBe(45.4);
  });

  it("reports profit as unknown, not inflated, when no cost is entered", () => {
    const e = variantEconomics({ unitsSold: 4, revenue: 100, refunds: 0 }, null, 2.9);
    expect(e.cogs).toBeNull();
    expect(e.profit).toBeNull();
    expect(e.margin).toBeNull();
    expect(e.revenue).toBe(100);
  });

  it("handles a variant that never sold", () => {
    expect(variantEconomics({ unitsSold: 0, revenue: 0, refunds: 0 }, 5, 2.9)).toMatchObject({ profit: 0, margin: null });
  });
});

describe("totalEconomics", () => {
  it("sums variants", () => {
    const t = totalEconomics([
      variantEconomics({ unitsSold: 10, revenue: 300, refunds: 30 }, 12.5, 2.9),
      variantEconomics({ unitsSold: 2, revenue: 50, refunds: 0 }, 10, 2.9),
    ]);
    expect(t).toMatchObject({ unitsSold: 12, revenue: 350, refunds: 30, profit: 164.85 });
  });

  it("is unknown if any variant that sold has no cost, but ignores unsold variants without one", () => {
    const sold = variantEconomics({ unitsSold: 1, revenue: 20, refunds: 0 }, 5, 0);
    expect(totalEconomics([sold, variantEconomics({ unitsSold: 1, revenue: 20, refunds: 0 }, null, 0)]).profit).toBeNull();
    expect(totalEconomics([sold, variantEconomics({ unitsSold: 0, revenue: 0, refunds: 0 }, null, 0)]).profit).toBe(15);
  });
});
