import { prisma } from "@/lib/db";
import type { Alert, AlertThreshold } from "./definitions";
import { DEFAULT_THRESHOLDS } from "./definitions";

export async function checkAlertsForStore(storeId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];

  // Get campaigns and their metrics
  const campaigns = await prisma.metaCampaign.findMany({
    where: { storeId },
    include: { adSets: { include: { spendDaily: true } } },
  });

  // Check high ROAS
  campaigns.forEach((campaign) => {
    if (campaign.roas && campaign.roas > (DEFAULT_THRESHOLDS.high_roas.threshold || 3.0)) {
      alerts.push({
        id: `high_roas_${campaign.id}`,
        storeId,
        type: "high_roas",
        campaignId: campaign.id,
        campaignName: campaign.name,
        metric: "ROAS",
        value: campaign.roas,
        threshold: DEFAULT_THRESHOLDS.high_roas.threshold,
        message: `📈 ${campaign.name} has high ROAS of ${campaign.roas.toFixed(2)}x — consider scaling`,
        createdAt: new Date(),
        resolved: false,
      });
    }
  });

  // Check low ROAS
  campaigns.forEach((campaign) => {
    if (campaign.roas && campaign.roas < (DEFAULT_THRESHOLDS.low_roas.threshold || 1.5)) {
      alerts.push({
        id: `low_roas_${campaign.id}`,
        storeId,
        type: "low_roas",
        campaignId: campaign.id,
        campaignName: campaign.name,
        metric: "ROAS",
        value: campaign.roas,
        threshold: DEFAULT_THRESHOLDS.low_roas.threshold,
        message: `📉 ${campaign.name} has low ROAS of ${campaign.roas.toFixed(2)}x — consider pausing or optimizing`,
        createdAt: new Date(),
        resolved: false,
      });
    }
  });

  // Check budget exceeded
  campaigns.forEach((campaign) => {
    let spent = 0;
    campaign.adSets.forEach((adSet) => {
      adSet.spendDaily.forEach((s) => {
        spent += s.spendCents / 100;
      });
    });

    const budgetPercent = (spent / (campaign.dailyBudget || 1)) * 100;
    if (budgetPercent > 110) {
      alerts.push({
        id: `budget_exceeded_${campaign.id}`,
        storeId,
        type: "budget_exceeded",
        campaignId: campaign.id,
        campaignName: campaign.name,
        metric: "Budget",
        value: budgetPercent,
        threshold: 110,
        message: `💰 ${campaign.name} spent ${budgetPercent.toFixed(0)}% of daily budget`,
        createdAt: new Date(),
        resolved: false,
      });
    }
  });

  return alerts;
}

export async function checkDailySummary(storeId: string) {
  const orders = await prisma.order.findMany({
    where: {
      storeId,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    include: { lineItems: { include: { variant: true } } },
  });

  let revenue = 0,
    cogs = 0;
  orders.forEach((order) => {
    revenue += order.total || 0;
    order.lineItems.forEach((item) => {
      cogs += (item.variant?.cogs || 0) * item.quantity;
    });
  });

  const profit = revenue - cogs - revenue * 0.03;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return {
    date: new Date().toLocaleDateString(),
    revenue: revenue.toFixed(2),
    profit: profit.toFixed(2),
    margin: margin.toFixed(1),
    orders: orders.length,
  };
}
