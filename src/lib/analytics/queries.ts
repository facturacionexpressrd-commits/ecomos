import { prisma } from "@/lib/db";
import { Decimal } from "@prisma/client/runtime/library";

function toNumber(value: Decimal | number | null | undefined): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  return parseFloat(value.toString());
}

export async function getRevenueByDate(storeId: string, days: number = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      placedAt: { gte: startDate },
    },
    select: { placedAt: true, totalPrice: true },
  });

  const byDate = new Map<string, number>();
  orders.forEach((o) => {
    const date = o.placedAt.toISOString().split("T")[0];
    const revenue = toNumber(o.totalPrice);
    byDate.set(date, (byDate.get(date) || 0) + revenue);
  });

  return Array.from(byDate.entries()).map(([date, revenue]) => ({
    date,
    revenue,
  }));
}

export async function getProfitByDate(storeId: string, days: number = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: {
      storeId,
      placedAt: { gte: startDate },
    },
    include: { lineItems: true },
  });

  const profitByDate = new Map<string, number>();

  orders.forEach((order) => {
    const date = order.placedAt.toISOString().split("T")[0];
    const revenue = toNumber(order.totalPrice);
    const fees = revenue * 0.03;
    const profit = revenue - fees;

    profitByDate.set(date, (profitByDate.get(date) || 0) + profit);
  });

  return Array.from(profitByDate.entries()).map(([date, profit]) => ({
    date,
    profit,
  }));
}

export async function getProductPerformance(storeId: string, limit: number = 20) {
  const products = await prisma.product.findMany({
    where: { storeId },
    take: limit,
  });

  return products.map((product) => ({
    id: product.id,
    title: product.title,
    revenue: 0,
    cogs: 0,
    profit: 0,
    margin: 0,
    quantity: 0,
  }));
}

export async function getCampaignMetrics(storeId: string) {
  const campaigns = await prisma.metaCampaign.findMany({
    where: { storeId },
  });

  return campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    status: campaign.status,
    spend: toNumber(campaign.totalSpend),
    clicks: 0,
    impressions: 0,
    cpc: 0,
    ctr: 0,
    roas: 1.5,
  }));
}

export async function getCustomerCohorts(storeId: string) {
  return {
    newCustomers: 0,
    returningCustomers: 0,
    newRevenue: 0,
    returningRevenue: 0,
    newRepeatRate: 0,
  };
}

export async function getStoreSummary(storeId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { storeId, placedAt: { gte: startDate } },
    select: { totalPrice: true, customerId: true },
  });

  let totalRevenue = 0;
  const customers = new Set<string>();

  orders.forEach((order) => {
    totalRevenue += toNumber(order.totalPrice);
    if (order.customerId) customers.add(order.customerId);
  });

  const profit = totalRevenue * 0.6; // ponytail: rough estimate
  const margin = 60;
  const aov = orders.length > 0 ? totalRevenue / orders.length : 0;

  return {
    revenue: totalRevenue,
    profit,
    margin,
    orders: orders.length,
    customers: customers.size,
    aov,
  };
}
