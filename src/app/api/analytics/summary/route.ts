import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { requireActiveBusiness } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    const storeId = session.activeStore.id;

    // Get 30-day summary
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const orders = await prisma.order.findMany({
      where: { storeId, createdAt: { gte: startDate } },
      include: { lineItems: { include: { variant: true } } },
    });

    let revenue = 0,
      cogs = 0,
      totalOrders = 0,
      customers = new Set<string>();

    orders.forEach((order) => {
      revenue += order.total || 0;
      totalOrders += 1;
      if (order.customerId) customers.add(order.customerId);

      order.lineItems.forEach((item) => {
        cogs += (item.variant?.cogs || 0) * item.quantity;
      });
    });

    const profit = revenue - cogs - revenue * 0.03;
    const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    const aov = totalOrders > 0 ? revenue / totalOrders : 0;

    // Get top products
    const products = await prisma.product.findMany({
      where: { storeId },
      include: { variants: { include: { lineItems: true } } },
      take: 20,
    });

    const topProducts = products
      .map((product) => {
        let prodRevenue = 0,
          prodCogs = 0;
        product.variants.forEach((variant) => {
          variant.lineItems.forEach((item) => {
            prodRevenue += item.price * item.quantity;
            prodCogs += (variant.cogs || 0) * item.quantity;
          });
        });
        return {
          id: product.id,
          title: product.title,
          revenue: prodRevenue,
          cogs: prodCogs,
          profit: prodRevenue - prodCogs,
          margin: prodRevenue > 0 ? ((prodRevenue - prodCogs) / prodRevenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    // Get campaigns
    const campaigns = await prisma.metaCampaign.findMany({
      where: { storeId },
      include: { adSets: { include: { spendDaily: true } } },
      take: 10,
    });

    const campaignData = campaigns.map((campaign) => {
      let spend = 0,
        clicks = 0;
      campaign.adSets.forEach((adSet) => {
        adSet.spendDaily.forEach((s) => {
          spend += s.spendCents / 100;
          clicks += s.clicks || 0;
        });
      });
      return {
        id: campaign.id,
        name: campaign.name,
        spend,
        clicks,
        cpc: clicks > 0 ? spend / clicks : 0,
        roas: campaign.roas || 1,
      };
    });

    return NextResponse.json({
      revenue,
      profit,
      margin,
      orders: totalOrders,
      customers: customers.size,
      aov,
      topProducts,
      campaigns: campaignData,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
