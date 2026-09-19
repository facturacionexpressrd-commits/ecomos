import { Decimal } from "@prisma/client/runtime/library";

/**
 * Finance formulas for EcomOS.
 * All inputs/outputs are in the store's currency.
 * All calculations are pure functions with no side effects.
 */

export interface VariantEconomics {
  variantId: string;
  price: number; // Shopify price per unit
  cost: number; // Manual COGS entry per unit
  quantity: number; // units sold in period
  paymentFeesPercentage: number; // e.g., 2.9% for Stripe
}

export interface StoreMetrics {
  grossRevenue: number; // sum of order totals
  refunds: number; // refunded amounts
  paymentFeesPercentage: number; // e.g., 2.9% for Stripe
  totalCogs: number; // sum of (cost per unit × quantity)
  adSpend?: number; // optional, default 0
}

/**
 * Contribution Profit = Gross Revenue - Refunds - Payment Fees - COGS
 * Label: "Contribution Profit" (contribution to fixed costs & profit)
 *
 * Why excluded:
 * - Labor, rent, utilities: not tracked at product level
 * - Platform fees, taxes: handled separately in accounting
 * - Ad spend: optional; can be 0 or unset
 *
 * Formula: (Gross Revenue - Refunds) × (1 - PaymentFeeFraction) - COGS
 */
export function contributionProfit(
  grossRevenue: number,
  refunds: number,
  paymentFeesPercentage: number,
  totalCogs: number
): number {
  const netRevenue = grossRevenue - refunds;
  const paymentFeesFraction = paymentFeesPercentage / 100;
  const paymentFees = netRevenue * paymentFeesFraction;
  return netRevenue - paymentFees - totalCogs;
}

/**
 * Contribution Margin = Contribution Profit / Gross Revenue
 * Label: "Contribution Margin %" (what % of revenue becomes contribution)
 *
 * Interpretation:
 * - 50% margin: 50 cents of every dollar becomes contribution
 * - <0% margin: losing money on direct costs alone
 *
 * Edge case: if grossRevenue is 0, margin is 0 (no sales, no margin)
 */
export function contributionMargin(
  grossRevenue: number,
  refunds: number,
  paymentFeesPercentage: number,
  totalCogs: number
): number {
  if (grossRevenue === 0) return 0;
  const profit = contributionProfit(grossRevenue, refunds, paymentFeesPercentage, totalCogs);
  return (profit / grossRevenue) * 100;
}

/**
 * Break-Even CPA (Cost Per Acquisition) = Ad Spend / Unique Customers
 * Label: "Break-Even CPA"
 *
 * Interpretation:
 * - You can afford to spend up to this amount per customer
 *   and still break even on contribution profit (assuming uniform order value).
 * - If CPA = $10 and this value is $8, your ads are profitable.
 *
 * Edge case: if ad spend is 0 or unset, CPA is 0 (no ads to cost)
 * Edge case: if customers is 0, CPA is 0 (no sales, no cost per customer)
 */
export function breakEvenCpa(
  contributionProfitValue: number,
  uniqueCustomers: number,
  adSpend: number = 0
): number {
  if (uniqueCustomers === 0 || adSpend === 0) return 0;
  return adSpend / uniqueCustomers;
}

/**
 * Maximum Sustainable CPA = Contribution Profit / Unique Customers
 * Label: "Max Sustainable CPA"
 *
 * Interpretation:
 * - You can afford to spend THIS MUCH per customer via ads
 *   and still reach breakeven (assuming all contribution profit goes to ads).
 * - If this value is $10 and your actual CPA is $8, you're profitable.
 * - If this value is $5 and your actual CPA is $8, you're losing money on ads.
 *
 * Edge case: if contribution profit ≤ 0, max CPA is 0 (not worth buying customers)
 * Edge case: if customers is 0, max CPA is 0 (no one to acquire)
 */
export function maxSustainableCpa(
  contributionProfitValue: number,
  uniqueCustomers: number
): number {
  if (uniqueCustomers === 0 || contributionProfitValue <= 0) return 0;
  return contributionProfitValue / uniqueCustomers;
}

/**
 * Break-Even ROAS (Return On Ad Spend) = Gross Revenue / Ad Spend
 * Label: "Break-Even ROAS"
 *
 * Interpretation:
 * - For every $1 spent on ads, you get back $X in gross revenue.
 * - ROAS = 1.0 means you break even on revenue (ignoring costs).
 * - ROAS > 1.0 means you get more revenue than you spent.
 *
 * This is DIFFERENT from profitable ROAS, which accounts for costs.
 * A ROAS of 2.0 is good revenue-wise, but if COGS is 60%, you're only
 * making 40% contribution margin, so true profit ROAS might be < 1.0.
 *
 * Edge case: if ad spend is 0 or unset, ROAS is 0 (no ads, no return ratio)
 * Edge case: if gross revenue is 0, ROAS is 0 (no revenue, no return)
 */
export function breakEvenRoas(grossRevenue: number, adSpend: number = 0): number {
  if (adSpend === 0) return 0;
  return grossRevenue / adSpend;
}

/**
 * Contribution ROAS (Contribution Profit / Ad Spend)
 * Label: "Contribution ROAS"
 *
 * Interpretation:
 * - For every $1 spent on ads, you get back $X in contribution profit (after COGS & fees).
 * - This is the TRUE profitability measure for ad spend.
 * - ROAS > 1.0 means ads are profitable.
 * - ROAS < 1.0 means you're losing money on ads (spending > profit).
 *
 * Edge case: if ad spend is 0, ROAS is 0 (no ads, no return ratio)
 * Edge case: if contribution profit ≤ 0, ROAS ≤ 0 (losing money overall)
 */
export function contributionRoas(
  contributionProfitValue: number,
  adSpend: number = 0
): number {
  if (adSpend === 0) return 0;
  return contributionProfitValue / adSpend;
}

/**
 * Payback Period (in days) = Ad Spend / (Contribution Profit / Days)
 * Label: "Ad Payback Period"
 *
 * Interpretation:
 * - How many days of contribution profit it takes to "pay back" the ad spend.
 * - E.g., if payback = 3 days and you're looking at a 30-day month,
 *   you have 27 days of pure profit (after paying back the ad spend).
 *
 * Edge case: if daily profit ≤ 0 or ad spend ≤ 0, payback is Infinity or 0
 */
export function adPaybackPeriodDays(
  contributionProfitValue: number,
  adSpend: number = 0,
  periodDays: number = 1
): number {
  if (adSpend === 0 || periodDays === 0) return 0;
  const dailyProfit = contributionProfitValue / periodDays;
  if (dailyProfit <= 0) return Infinity;
  return adSpend / dailyProfit;
}

// ===== VARIANT-LEVEL ECONOMICS =====

/**
 * Single-variant contribution = (price - paymentFee - cost) × quantity
 * Useful for product detail screens showing per-variant contribution.
 */
export function variantContribution(
  price: number,
  cost: number,
  quantity: number,
  paymentFeesPercentage: number
): number {
  const paymentFeesFraction = paymentFeesPercentage / 100;
  const paymentFee = price * paymentFeesFraction;
  return (price - paymentFee - cost) * quantity;
}

/**
 * Variant contribution margin = contribution / (price × quantity)
 * Useful for identifying low-margin products.
 */
export function variantContributionMargin(
  price: number,
  cost: number,
  quantity: number,
  paymentFeesPercentage: number
): number {
  const totalRevenue = price * quantity;
  if (totalRevenue === 0) return 0;
  const contrib = variantContribution(price, cost, quantity, paymentFeesPercentage);
  return (contrib / totalRevenue) * 100;
}

// ===== META ADS SPECIFIC ROAS =====

/**
 * Meta Revenue ROAS = Total Revenue from Attribution / Ad Spend
 * Label: "Meta Revenue ROAS"
 *
 * Interpretation:
 * - For every $1 spent on Meta ads, you get back $X in gross revenue.
 * - ROAS = 1.5 means $1.50 revenue per $1 spent.
 * - This does NOT account for costs (COGS, fees).
 *
 * Edge case: if ad spend is 0, ROAS is 0
 */
export function metaRevenueRoas(attributedRevenue: number, adSpend: number = 0): number {
  if (adSpend === 0) return 0;
  return attributedRevenue / adSpend;
}

/**
 * Meta Contribution ROAS = Contribution Profit from Attribution / Ad Spend
 * Label: "Meta Contribution ROAS"
 *
 * Interpretation:
 * - For every $1 spent on Meta ads, you get back $X in contribution profit (after COGS & fees).
 * - ROAS > 1.0 means profitable.
 * - ROAS < 1.0 means losing money on this campaign.
 *
 * This is the TRUE profitability metric for Meta spend.
 */
export function metaContributionRoas(attributedProfit: number, adSpend: number = 0): number {
  if (adSpend === 0) return 0;
  return attributedProfit / adSpend;
}

/**
 * Meta CPA (Cost Per Action) = Ad Spend / Conversions
 * Label: "Meta CPA"
 *
 * Interpretation:
 * - What you spent per conversion (order, signup, etc.)
 * - Compare to "Max Sustainable CPA" to see if profitable
 */
export function metaCpa(adSpend: number, conversions: number): number {
  if (conversions === 0) return 0;
  return adSpend / conversions;
}

/**
 * Meta Profitability Index = Contribution ROAS - 1.0
 * Label: "Meta Profitability Index"
 *
 * Interpretation:
 * - Positive: profitable (you gain this much per $1 spent)
 * - 0: break-even
 * - Negative: losing money
 *
 * Example: ROAS 1.5 → PI = 0.5 (gain $0.50 per $1 spent)
 */
export function metaProfitabilityIndex(attributedProfit: number, adSpend: number = 0): number {
  if (adSpend === 0) return 0;
  return metaContributionRoas(attributedProfit, adSpend) - 1.0;
}
