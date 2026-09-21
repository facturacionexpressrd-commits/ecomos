export interface DayInput {
  /** totalPrice is Shopify's *current* total, i.e. already net of refunds. */
  orders: { totalPrice: number; refunded: number }[];
  lines: { quantity: number; unitCost: number }[];
  feePercent: number;
  feeFixed: number;
}

const cents = (n: number) => Math.round(n * 100) / 100;

export function buildDailyMetric({ orders, lines, feePercent, feeFixed }: DayInput) {
  const net = orders.reduce((s, o) => s + o.totalPrice, 0);
  const refunds = orders.reduce((s, o) => s + o.refunded, 0);
  // Add refunds back so grossRevenue is pre-refund; otherwise they'd be subtracted twice.
  const grossRevenue = net + refunds;
  // Payment processors keep their fee on refunded sales, so fees use pre-refund revenue.
  const fees = (grossRevenue * feePercent) / 100 + orders.length * feeFixed;
  const cogs = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);

  return {
    grossRevenue: cents(grossRevenue),
    refunds: cents(refunds),
    fees: cents(fees),
    cogs: cents(cogs),
    contributionProfit: cents(grossRevenue - refunds - fees - cogs),
  };
}
