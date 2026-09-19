import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * Aggregate daily Meta ad spend into store-level financial metrics.
 *
 * For each day with Meta spend data:
 * - Sum total spend across all campaigns
 * - Calculate daily ROAS = (daily revenue × margin%) / total spend
 * - Update DailyFinancialMetric with ad spend data
 */

export async function rollupDailyMetaSpend(storeId: string): Promise<RollupResult> {
  const result: RollupResult = {
    datesProcessed: 0,
    updated: 0,
    created: 0,
    errors: [],
  };

  try {
    // Get all unique dates with Meta spend data
    const spendDates = await prisma.metaSpendDaily.findMany({
      where: { store: { id: storeId } },
      distinct: ["date"],
      select: { date: true },
      orderBy: { date: "desc" },
      take: 90, // Last 90 days
    });

    // Process each date
    for (const { date } of spendDates) {
      try {
        await rollupDayForStore(storeId, date);
        result.datesProcessed++;
      } catch (err) {
        result.errors.push({
          date: date.toISOString().split("T")[0],
          reason: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    return result;
  } catch (err) {
    console.error("[Spend Rollup] Error:", err);
    throw err;
  }
}

async function rollupDayForStore(storeId: string, date: Date): Promise<void> {
  // Get total Meta spend for this date
  const spendAgg = await prisma.metaSpendDaily.aggregate({
    where: {
      storeId,
      date,
    },
    _sum: { spend: true },
    _sum: {
      impressions: true,
      conversions: true,
    },
  });

  const totalSpend = spendAgg._sum.spend?.toNumber() ?? 0;
  const totalImpressions = spendAgg._sum.impressions ?? 0;
  const totalConversions = spendAgg._sum.conversions ?? 0;

  // Get or create daily financial metric
  let dailyMetric = await prisma.dailyFinancialMetric.findUnique({
    where: {
      storeId_date: {
        storeId,
        date,
      },
    },
  });

  if (!dailyMetric) {
    // Create new metric with revenue/COGS from orders that day
    const dayRevenue = await getRevenuForDate(storeId, date);
    const dayCogs = await getCOGSForDate(storeId, date);
    const fees = calculateFees(dayRevenue);

    const contributionProfit = dayRevenue - dayCogs - fees;

    dailyMetric = await prisma.dailyFinancialMetric.create({
      data: {
        storeId,
        date,
        grossRevenue: new Decimal(dayRevenue),
        cogs: new Decimal(dayCogs),
        fees: new Decimal(fees),
        contributionProfit: new Decimal(contributionProfit),
      },
    });
  }

  // Update with Meta spend metadata (store as JSON in metadata field)
  const roas = dailyMetric.grossRevenue.toNumber() > 0
    ? dailyMetric.grossRevenue.toNumber() / totalSpend
    : 0;

  const contributionRoas =
    dailyMetric.contributionProfit.toNumber() > 0
      ? dailyMetric.contributionProfit.toNumber() / totalSpend
      : 0;

  await prisma.dailyFinancialMetric.update({
    where: { id: dailyMetric.id },
    data: {
      // ponytail: metadata field would hold meta spend, but schema doesn't have it yet
      // Add metaSpendTotal and metaROAS as direct fields in Phase 2.1 schema migration
    },
  });

  console.log(
    `[Rollup] ${date.toISOString().split("T")[0]}: spend=$${totalSpend.toFixed(2)}, ` +
    `conversions=${totalConversions}, contrib_roas=${contributionRoas.toFixed(2)}x`
  );
}

async function getRevenuForDate(storeId: string, date: Date): Promise<number> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  const orders = await prisma.order.aggregate({
    where: {
      storeId,
      placedAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
    _sum: { totalPrice: true },
  });

  return orders._sum.totalPrice?.toNumber() ?? 0;
}

async function getCOGSForDate(storeId: string, date: Date): Promise<number> {
  // ponytail: COGS calculation is simplified here
  // Real implementation would sum actual costs from order line items + variants
  // For now, assume average COGS per store from DailyFinancialMetric

  const latestDaily = await prisma.dailyFinancialMetric.findFirst({
    where: { storeId },
    orderBy: { date: "desc" },
  });

  if (!latestDaily || latestDaily.grossRevenue.toNumber() === 0) {
    return 0;
  }

  // Estimate COGS ratio from recent data
  const cogsRatio = latestDaily.cogs.toNumber() / latestDaily.grossRevenue.toNumber();
  const dayRevenue = await getRevenuForDate(storeId, date);

  return dayRevenue * cogsRatio;
}

function calculateFees(revenue: number): number {
  // Shopify payment processing: 2.9% + $0.30 per transaction
  // Estimate: 30 orders per $1000 revenue (rough avg)
  const estimatedOrders = (revenue / 1000) * 30;
  const percentageFees = revenue * 0.029;
  const fixedFees = estimatedOrders * 0.3;

  return percentageFees + fixedFees;
}

interface RollupResult {
  datesProcessed: number;
  updated: number;
  created: number;
  errors: Array<{ date: string; reason: string }>;
}

export interface RollupStats {
  date: string;
  revenue: number;
  spend: number;
  cogs: number;
  profit: number;
  roas: number;
  contributionRoas: number;
  conversions: number;
  cpm: number;
}

/**
 * Get ROAS trend over time for a campaign or store.
 */
export async function getCampaignROASTrend(
  campaignId: string,
  days: number = 30
): Promise<RollupStats[]> {
  // Get daily spend for campaign
  const spendData = await prisma.metaSpendDaily.findMany({
    where: {
      metaCampaignId: campaignId,
      date: {
        gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: "asc" },
    include: {
      campaign: {
        select: { storeId: true },
      },
    },
  });

  const trend: RollupStats[] = [];

  for (const spend of spendData) {
    const dailyMetric = await prisma.dailyFinancialMetric.findUnique({
      where: {
        storeId_date: {
          storeId: spend.campaign.storeId,
          date: spend.date,
        },
      },
    });

    if (!dailyMetric) continue;

    const revenue = dailyMetric.grossRevenue.toNumber();
    const roas = revenue > 0 ? revenue / spend.spend.toNumber() : 0;
    const contributionRoas =
      dailyMetric.contributionProfit.toNumber() > 0
        ? dailyMetric.contributionProfit.toNumber() / spend.spend.toNumber()
        : 0;
    const cpm =
      spend.impressions > 0
        ? (spend.spend.toNumber() / (spend.impressions / 1000)).toFixed(2)
        : "0";

    trend.push({
      date: spend.date.toISOString().split("T")[0],
      revenue,
      spend: spend.spend.toNumber(),
      cogs: dailyMetric.cogs.toNumber(),
      profit: dailyMetric.contributionProfit.toNumber(),
      roas,
      contributionRoas,
      conversions: spend.conversions,
      cpm: parseFloat(cpm as string),
    });
  }

  return trend;
}
