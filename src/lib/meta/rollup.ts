import { prisma } from "@/lib/db";
import { buildDailyMetric } from "@/lib/finance/daily";
import type { Prisma } from "@prisma/client";

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
  // Get total Meta spend for this date.
  // These three must stay in ONE _sum: a second _sum key silently replaces the
  // first, which previously dropped `spend` and pinned every ROAS to 0.
  const spendAgg = await prisma.metaSpendDaily.aggregate({
    where: {
      storeId,
      date,
    },
    _sum: {
      spend: true,
      impressions: true,
      conversions: true,
    },
  });

  const totalSpend = spendAgg._sum.spend?.toNumber() ?? 0;
  const totalConversions = spendAgg._sum.conversions ?? 0;

  // Recompute from real orders every run so late orders and refunds correct the row.
  const { unknownCostLineItems, unknownCostUnits, ...metric } = await computeDailyMetric(storeId, date);
  const saved = await prisma.dailyFinancialMetric.upsert({
    where: { storeId_date: { storeId, date } },
    create: { storeId, date, ...metric },
    update: metric,
  });

  const contributionRoas =
    totalSpend > 0 ? saved.contributionProfit.toNumber() / totalSpend : 0;

  // DailyFinancialMetric has nowhere to store ad spend or the unknown-cost
  // counters yet, so the rollup only ensures the row exists and logs the
  // rest. Persisting metaSpendTotal/metaRoas/unknownCostUnits needs a schema
  // migration (Phase 2.1) — until then an update here would write an empty
  // object and cost a round trip.
  console.log(
    `[Rollup] ${date.toISOString().split("T")[0]}: spend=$${totalSpend.toFixed(2)}, ` +
    `conversions=${totalConversions}, contrib_roas=${contributionRoas.toFixed(2)}x` +
    (unknownCostLineItems > 0
      ? `, WARNING: ${unknownCostLineItems} line item(s) / ${unknownCostUnits} unit(s) had no COGS entry and were excluded from cogs`
      : "")
  );
}

async function computeDailyMetric(storeId: string, date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  const [store, orders] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      select: { paymentFeePercent: true, paymentFeeFixed: true },
    }),
    prisma.order.findMany({
      where: { storeId, placedAt: { gte: startOfDay, lt: endOfDay } },
      select: {
        totalPrice: true,
        refunds: { select: { amount: true } },
        lineItems: { select: { quantity: true, variant: { select: { cost: true } } } },
      },
    }),
  ]);

  return buildDailyMetric({
    feePercent: store.paymentFeePercent.toNumber(),
    feeFixed: store.paymentFeeFixed.toNumber(),
    orders: orders.map((o) => ({
      totalPrice: o.totalPrice.toNumber(),
      refunded: o.refunds.reduce((sum, r) => sum + r.amount.toNumber(), 0),
    })),
    lines: orders.flatMap((o) =>
      o.lineItems.map((l) => ({ quantity: l.quantity, unitCost: l.variant?.cost?.toNumber() ?? null }))
    ),
  });
}

/** Rolls up every store with a connected Meta account; one store failing never stops the rest. */
export async function rollupAllMetaStores() {
  const stores = await prisma.store.findMany({
    where: { metaAccounts: { some: { status: "connected" } } },
    select: { id: true, name: true, organizationId: true },
  });

  const results: Record<string, unknown> = {};
  let datesProcessed = 0;
  let errors = 0;

  for (const store of stores) {
    try {
      const rollup = await rollupDailyMetaSpend(store.id);
      results[store.name] = rollup;
      datesProcessed += rollup.datesProcessed;
      errors += rollup.errors.length;
      await prisma.auditLog.create({
        data: {
          organizationId: store.organizationId,
          storeId: store.id,
          action: "meta_spend_rollup_completed",
          metadata: rollup as unknown as Prisma.InputJsonObject,
        },
      });
    } catch (err) {
      console.error(`[Rollup] Error for store ${store.name}:`, err);
      results[store.name] = { error: err instanceof Error ? err.message : "Unknown error" };
      errors++;
    }
  }

  return { stores: stores.length, datesProcessed, errors, results };
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
