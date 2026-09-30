import { prisma } from "@/lib/db";

export async function getRevenueByDate(storeId: string, days: number = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.groupBy({
    by: ["createdAt"],
    where: {
      storeId,
      createdAt: { gte: startDate },
    },
    _sum: { total: true },
  });

  return orders.map((o) => ({
    date: o.createdAt,
    revenue: o._sum.total || 0,
  }));
}

export async function getProfitByDate(storeId: string, days: number = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const lineItems = await prisma.orderLineItem.findMany({
    where: {
      order: { storeId, createdAt: { gte: startDate } },
    },
    include: { order: true, variant: true },
  });

  const profitByDate = new Map<string, number>();

  lineItems.forEach((item) => {
    const date = item.order.createdAt.toISOString().split("T")[0];
    const revenue = item.price * item.quantity;
    const cogs = item.variant?.cogs || 0;
    const fees = revenue * 0.03; // 3% payment fee estimate

    const profit = revenue - (cogs * item.quantity) - fees;
    profitByDate.set(date, (profitByDate.get(date) || 0) + profit);
  });

  return Array.from(profitByDate.entries()).map(([date, profit]) => ({
    date: new Date(date),
    profit,
  }));
}

export async function getProductPerformance(storeId: string, limit: number = 20) {
  const products = await prisma.product.findMany({
    where: { storeId },
    include: {
      variants: {
        include: {
          lineItems: {
            include: { order: true },
          },
        },
      },
      aiCopy: true,
    },
    take: limit,
  });

  return products
    .map((product) => {
      let revenue = 0,
        cogs = 0,
        quantity = 0;

      product.variants.forEach((variant) => {
        variant.lineItems.forEach((item) => {
          revenue += item.price * item.quantity;
          cogs += (variant.cogs || 0) * item.quantity;
          quantity += item.quantity;
        });
      });

      const profit = revenue - cogs - revenue * 0.03;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        id: product.id,
        title: product.title,
        revenue,
        cogs,
        profit,
        margin,
        quantity,
        hasAICopy: !!product.aiCopy.length,
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

export async function getCampaignMetrics(storeId: string) {
  const campaigns = await prisma.metaCampaign.findMany({
    where: { storeId },
    include: {
      adSets: {
        include: {
          spendDaily: true,
          creatives: true,
        },
      },
    },
  });

  return campaigns.map((campaign) => {
    let totalSpend = 0;
    let totalClicks = 0;
    let totalImpressions = 0;

    campaign.adSets.forEach((adSet) => {
      adSet.spendDaily.forEach((spend) => {
        totalSpend += spend.spendCents / 100;
        totalClicks += spend.clicks || 0;
        totalImpressions += spend.impressions || 0;
      });
    });

    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      cpc,
      ctr,
      roas: campaign.roas,
    };
  });
}

export async function getCustomerCohorts(storeId: string) {
  const customers = await prisma.customer.findMany({
    where: { storeId },
    include: { orders: true },
  });

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const newCustomers = customers.filter(
    (c) => c.createdAt >= thirtyDaysAgo && c.orders.length === 1
  );
  const returningCustomers = customers.filter(
    (c) => c.createdAt >= thirtyDaysAgo && c.orders.length > 1
  );

  const newRevenue = newCustomers.reduce(
    (sum, c) =>
      sum +
      c.orders.reduce((o, ord) => o + (ord.total || 0), 0),
    0
  );
  const returningRevenue = returningCustomers.reduce(
    (sum, c) =>
      sum +
      c.orders.reduce((o, ord) => o + (ord.total || 0), 0),
    0
  );

  return {
    newCustomers: newCustomers.length,
    returningCustomers: returningCustomers.length,
    newRevenue,
    returningRevenue,
    newRepeatRate:
      newCustomers.length > 0
        ? (newCustomers.filter((c) => c.orders.length > 1).length /
            newCustomers.length) *
          100
        : 0,
  };
}

export async function getStoreSummary(storeId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { storeId, createdAt: { gte: startDate } },
    include: { lineItems: { include: { variant: true } } },
  });

  let totalRevenue = 0,
    totalCogs = 0,
    totalOrders = 0,
    totalCustomers = new Set<string>();

  orders.forEach((order) => {
    totalRevenue += order.total || 0;
    totalOrders += 1;
    if (order.customerId) totalCustomers.add(order.customerId);

    order.lineItems.forEach((item) => {
      totalCogs += (item.variant?.cogs || 0) * item.quantity;
    });
  });

  const totalProfit = totalRevenue - totalCogs - totalRevenue * 0.03;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    revenue: totalRevenue,
    profit: totalProfit,
    margin,
    orders: totalOrders,
    customers: totalCustomers.size,
    aov,
  };
}
