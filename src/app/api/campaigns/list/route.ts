import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { metaRevenueRoas, metaContributionRoas, metaProfitabilityIndex } from "@/lib/finance/formulas";

/**
 * GET /api/campaigns/list
 *
 * Fetch campaigns with ROAS and profitability metrics.
 *
 * Query params:
 * - storeId: store to fetch campaigns for
 * - sortBy: "spend" | "roas" | "profitability" (default: spend DESC)
 * - status: filter by campaign status
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");
    const sortBy = searchParams.get("sortBy") || "spend";
    const statusFilter = searchParams.get("status");

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    // Verify auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
      return NextResponse.json({ error: "No access to this store" }, { status: 403 });
    }

    // Fetch campaigns
    const campaigns = await prisma.metaCampaign.findMany({
      where: {
        storeId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      include: {
        spendDaily: true,
      },
      orderBy: sortBy === "spend" ? { totalSpend: "desc" } : { createdAt: "desc" },
    });

    // Fetch order revenue by campaign (heuristic: UTM source)
    // For MVP, estimate revenue by dividing store revenue evenly
    const totalOrders = await prisma.order.count({ where: { storeId } });
    const storeRevenue = await prisma.order.aggregate({
      where: { storeId },
      _sum: { totalPrice: true },
    });

    const avgRevenuePerCampaign =
      campaigns.length > 0
        ? (storeRevenue._sum.totalPrice?.toNumber() ?? 0) / campaigns.length
        : 0;

    // Get financial data
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    const latestDaily = await prisma.dailyFinancialMetric.findFirst({
      where: { storeId },
      orderBy: { date: "desc" },
    });

    const avgContributionMargin = latestDaily
      ? (latestDaily.contributionProfit.toNumber() /
          latestDaily.grossRevenue.toNumber()) *
        100
      : 0;

    // Calculate metrics for each campaign
    const campaignsWithMetrics = campaigns.map((campaign) => {
      const campaignSpend = campaign.totalSpend.toNumber();
      const campaignRevenue = avgRevenuePerCampaign; // Estimated
      const campaignProfit = campaignRevenue * (avgContributionMargin / 100);

      const revenueRoas = metaRevenueRoas(campaignRevenue, campaignSpend);
      const contributionRoas = metaContributionRoas(campaignProfit, campaignSpend);
      const profitability = metaProfitabilityIndex(campaignProfit, campaignSpend);

      return {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        spend: campaignSpend,
        impressions: campaign.impressions,
        conversions: campaign.conversions,
        revenueRoas: parseFloat(revenueRoas.toFixed(2)),
        contributionRoas: parseFloat(contributionRoas.toFixed(2)),
        profitability: parseFloat(profitability.toFixed(3)), // Profit per $1 spent
        estimatedRevenue: parseFloat(campaignRevenue.toFixed(2)),
        estimatedProfit: parseFloat(campaignProfit.toFixed(2)),
        cpa: campaign.conversions > 0 ? parseFloat((campaignSpend / campaign.conversions).toFixed(2)) : 0,
        syncedAt: campaign.syncedAt?.toISOString(),
        createdAt: campaign.createdAt.toISOString(),
      };
    });

    // Re-sort based on metric if needed
    if (sortBy === "roas") {
      campaignsWithMetrics.sort((a, b) => b.contributionRoas - a.contributionRoas);
    } else if (sortBy === "profitability") {
      campaignsWithMetrics.sort((a, b) => b.profitability - a.profitability);
    }

    return NextResponse.json({
      campaigns: campaignsWithMetrics,
      meta: {
        total: campaignsWithMetrics.length,
        totalSpend: parseFloat(
          campaignsWithMetrics.reduce((sum, c) => sum + c.spend, 0).toFixed(2)
        ),
        totalRevenue: parseFloat(
          campaignsWithMetrics.reduce((sum, c) => sum + c.estimatedRevenue, 0).toFixed(2)
        ),
        avgContributionRoas: parseFloat(
          (
            campaignsWithMetrics.reduce((sum, c) => sum + c.contributionRoas, 0) /
            Math.max(1, campaignsWithMetrics.length)
          ).toFixed(2)
        ),
      },
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return NextResponse.json(
      { error: "Failed to fetch campaigns" },
      { status: 500 }
    );
  }
}
