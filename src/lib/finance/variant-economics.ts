const cents = (n: number) => Math.round(n * 100) / 100;

export type VariantSales = {
  unitsSold: number;
  /** Sum of the variant's order lines after discounts — what customers paid for this variant. */
  revenue: number;
  /** Sum of refunded line subtotals for this variant. */
  refunds: number;
};

export type VariantEconomics = VariantSales & {
  fees: number;
  /** null when the variant has no cost entered: unknown, not $0. */
  cogs: number | null;
  profit: number | null;
  /** Percent of revenue; null when profit is unknown or there were no sales. */
  margin: number | null;
};

/**
 * One variant's real economics from its own order lines, using the same rules as the store-level
 * daily rollup (src/lib/finance/daily.ts): fees on pre-refund revenue (processors keep their fee on
 * refunded sales) and cost = unit cost × units sold. A variant with no cost entered gets no profit
 * rather than a profit that silently assumes free goods.
 * ponytail: only the percentage fee is applied; the fixed per-order fee belongs to the order, not a
 * line, so it's left to the store-level figures.
 */
export function variantEconomics(sales: VariantSales, unitCost: number | null, feePercent: number): VariantEconomics {
  const fees = cents(sales.revenue * (feePercent / 100));
  const cogs = unitCost === null ? null : cents(unitCost * sales.unitsSold);
  const profit = cogs === null ? null : cents(sales.revenue - sales.refunds - fees - cogs);
  const margin = profit === null || sales.revenue === 0 ? null : Math.round((profit / sales.revenue) * 1000) / 10;
  return { ...sales, fees, cogs, profit, margin };
}

/** Adds up variants for a product-level total. Profit is only known if every variant that sold has a cost. */
export function totalEconomics(rows: VariantEconomics[]): VariantEconomics {
  const sum = (pick: (r: VariantEconomics) => number) => cents(rows.reduce((s, r) => s + pick(r), 0));
  const sold = rows.filter((r) => r.unitsSold > 0);
  const known = sold.every((r) => r.profit !== null);
  const revenue = sum((r) => r.revenue);
  const profit = known ? sum((r) => r.profit ?? 0) : null;
  return {
    unitsSold: rows.reduce((s, r) => s + r.unitsSold, 0),
    revenue,
    refunds: sum((r) => r.refunds),
    fees: sum((r) => r.fees),
    cogs: known ? sum((r) => r.cogs ?? 0) : null,
    profit,
    margin: profit === null || revenue === 0 ? null : Math.round((profit / revenue) * 1000) / 10,
  };
}
