export interface DayInput {
  /** totalPrice is Shopify's *current* total, i.e. already net of refunds. */
  orders: { totalPrice: number; refunded: number }[];
  /** unitCost is null when the variant has no COGS entry — not the same as a real $0 cost. */
  lines: { quantity: number; unitCost: number | null }[];
  feePercent: number;
  feeFixed: number;
}

const cents = (n: number) => Math.round(n * 100) / 100;

/**
 * A line with no cost entry is excluded from cogs, not counted as $0 — folding
 * it into cogs would silently overstate contributionProfit for every store
 * that hasn't finished entering COGS. unknownCostUnits says how many units
 * that gap covers, so the number stays honest about what it doesn't know.
 */
export function buildDailyMetric({ orders, lines, feePercent, feeFixed }: DayInput) {
  const net = orders.reduce((s, o) => s + o.totalPrice, 0);
  const refunds = orders.reduce((s, o) => s + o.refunded, 0);
  // Add refunds back so grossRevenue is pre-refund; otherwise they'd be subtracted twice.
  const grossRevenue = net + refunds;
  // Payment processors keep their fee on refunded sales, so fees use pre-refund revenue.
  const fees = (grossRevenue * feePercent) / 100 + orders.length * feeFixed;
  const knownCostLines = lines.filter((l): l is { quantity: number; unitCost: number } => l.unitCost !== null);
  const unknownCostLines = lines.filter((l) => l.unitCost === null);
  const cogs = knownCostLines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  return {
    grossRevenue: cents(grossRevenue),
    refunds: cents(refunds),
    fees: cents(fees),
    cogs: cents(cogs),
    contributionProfit: cents(grossRevenue - refunds - fees - cogs),
    unknownCostLineItems: unknownCostLines.length,
    unknownCostUnits: unknownCostLines.reduce((s, l) => s + l.quantity, 0),
  };
}
