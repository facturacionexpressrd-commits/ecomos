import { describe, it, expect } from "vitest";
import { buildDailyMetric } from "../src/lib/finance/daily";

const base = { feePercent: 2.9, feeFixed: 0.3 };

describe("buildDailyMetric", () => {
  it("uses real line-item costs, not a ratio", () => {
    const m = buildDailyMetric({
      ...base,
      feePercent: 0,
      feeFixed: 0,
      orders: [{ totalPrice: 100, refunded: 0 }],
      lines: [{ quantity: 2, unitCost: 7.5 }],
    });
    expect(m.cogs).toBe(15);
    expect(m.contributionProfit).toBe(85);
  });

  it("charges percent per revenue plus the fixed fee per actual order", () => {
    const m = buildDailyMetric({
      ...base,
      orders: [
        { totalPrice: 50, refunded: 0 },
        { totalPrice: 50, refunded: 0 },
      ],
      lines: [],
    });
    expect(m.fees).toBe(3.5); // 100 * 2.9% + 2 * 0.30
  });

  it("does not subtract a refund twice", () => {
    // Order was $100; $40 refunded so Shopify reports a current total of $60.
    const m = buildDailyMetric({
      ...base,
      feePercent: 0,
      feeFixed: 0,
      orders: [{ totalPrice: 60, refunded: 40 }],
      lines: [],
    });
    expect(m.grossRevenue).toBe(100);
    expect(m.refunds).toBe(40);
    expect(m.contributionProfit).toBe(60);
  });

  it("keeps the payment fee on refunded sales", () => {
    const m = buildDailyMetric({
      ...base,
      feeFixed: 0,
      orders: [{ totalPrice: 0, refunded: 100 }],
      lines: [],
    });
    expect(m.fees).toBe(2.9);
    expect(m.contributionProfit).toBe(-2.9);
  });

  it("treats a missing variant cost as zero and an empty day as zeros", () => {
    expect(
      buildDailyMetric({ ...base, orders: [], lines: [{ quantity: 3, unitCost: 0 }] })
    ).toEqual({ grossRevenue: 0, refunds: 0, fees: 0, cogs: 0, contributionProfit: 0 });
  });
});
