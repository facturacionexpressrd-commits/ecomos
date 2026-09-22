import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import {
  metaRevenueRoas,
  metaContributionRoas,
  metaProfitabilityIndex,
  breakEvenRoas,
  maxSustainableCpa,
} from "@/lib/finance/formulas";
import BudgetEditor from "@/components/campaigns/BudgetEditor";
import AdSetManager from "@/components/campaigns/AdSetManager";

export const metadata = {
  title: "Campaign Details | EcomOS",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaign = await prisma.metaCampaign.findUnique({
    where: { id },
    include: {
      spendDaily: true,
      store: true,
      adSets: {
        include: {
          creatives: true,
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  // Verify user has access to this store
  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, campaign.storeId, CAPABILITIES.storeRead)) {
    notFound();
  }

  // Get financial data
  const latestDaily = await prisma.dailyFinancialMetric.findFirst({
    where: { storeId: campaign.storeId },
    orderBy: { date: "desc" },
  });

  // Estimate metrics
  const storeRevenue = await prisma.order.aggregate({
    where: { storeId: campaign.storeId },
    _sum: { totalPrice: true },
  });

  // Rough revenue attribution by spend proportion
  const allCampaigns = await prisma.metaCampaign.findMany({
    where: { storeId: campaign.storeId },
  });

  const totalSpend = allCampaigns.reduce((sum, c) => sum + c.totalSpend.toNumber(), 0);
  const campaignSpendRatio =
    totalSpend > 0 ? campaign.totalSpend.toNumber() / totalSpend : 0;

  const campaignRevenue =
    (storeRevenue._sum.totalPrice?.toNumber() ?? 0) * campaignSpendRatio;
  const avgContributionMargin = latestDaily
    ? (latestDaily.contributionProfit.toNumber() /
        latestDaily.grossRevenue.toNumber()) *
      100
    : 0;

  const campaignProfit = campaignRevenue * (avgContributionMargin / 100);
  const campaignSpend = campaign.totalSpend.toNumber();

  // Calculate all metrics
  const revenueRoas = metaRevenueRoas(campaignRevenue, campaignSpend);
  const contributionRoas = metaContributionRoas(campaignProfit, campaignSpend);
  const profitability = metaProfitabilityIndex(campaignProfit, campaignSpend);
  const breakEven = breakEvenRoas(campaign.conversions > 0 ? campaignSpend / campaign.conversions : 0);
  const maxCpa = maxSustainableCpa(
    campaign.conversions > 0 ? campaignProfit / campaign.conversions : 0,
    0.2 // 20% safety margin
  );

  const cpa = campaign.conversions > 0 ? campaignSpend / campaign.conversions : 0;

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <a
            href="/dashboard/meta/campaigns"
            className="text-gold-hi hover:underline"
          >
            ← Back to Campaigns
          </a>
        </div>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="mt-1 text-lo">{campaign.objective}</p>
        <div className="mt-3 flex gap-2">
          <span
            className={`inline-block rounded px-3 py-1 text-sm font-medium ${
              campaign.status === "ACTIVE"
                ? "bg-teal/15 text-teal"
                : campaign.status === "PAUSED"
                  ? "bg-gold/15 text-gold-hi"
                  : "bg-white/5 text-lo"
            }`}
          >
            {campaign.status}
          </span>
          <span className="text-sm text-faint">
            Last synced: {campaign.syncedAt?.toLocaleDateString() || "Never"}
          </span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Spend */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">Total Ad Spend</p>
          <p className="text-2xl font-bold">${campaignSpend.toFixed(2)}</p>
          <p className="mt-1 text-xs text-faint">
            {campaign.impressions.toLocaleString()} impressions
          </p>
        </div>

        {/* Revenue ROAS */}
        <div
          className={`rounded-lg border p-4 ${
            revenueRoas >= 1
              ? "border-teal/30 bg-teal/15"
              : "border-coral/30 bg-coral/15"
          }`}
        >
          <p className="text-sm text-lo">Revenue ROAS</p>
          <p
            className={`text-2xl font-bold ${
              revenueRoas >= 1 ? "text-teal" : "text-coral"
            }`}
          >
            {revenueRoas.toFixed(2)}x
          </p>
          <p className="mt-1 text-xs text-faint">
            Est. ${campaignRevenue.toFixed(0)} revenue
          </p>
        </div>

        {/* Contribution ROAS */}
        <div
          className={`rounded-lg border p-4 ${
            contributionRoas >= 1
              ? "border-gold/40 bg-gold/10"
              : "border-gold/30 bg-gold/15"
          }`}
        >
          <p className="text-sm text-lo">Contribution ROAS</p>
          <p
            className={`text-2xl font-bold ${
              contributionRoas >= 1 ? "text-gold-hi" : "text-gold-hi"
            }`}
          >
            {contributionRoas.toFixed(2)}x
          </p>
          <p className="mt-1 text-xs text-faint">
            Est. ${campaignProfit.toFixed(0)} profit
          </p>
        </div>

        {/* CPA */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">Cost Per Action</p>
          <p className="text-2xl font-bold">${cpa.toFixed(2)}</p>
          <p
            className={`mt-1 text-xs ${
              cpa <= maxCpa ? "text-teal" : "text-coral"
            }`}
          >
            Max sustainable: ${maxCpa.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Campaign Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Conversions */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">Conversions (Orders)</p>
          <p className="text-3xl font-bold">{campaign.conversions}</p>
          <p className="mt-2 text-xs text-faint">
            Conv. Rate: {campaign.impressions > 0
              ? ((campaign.conversions / campaign.impressions) * 100).toFixed(2)
              : "0"}%
          </p>
        </div>

        {/* CPM */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">CPM (Cost per 1K impressions)</p>
          <p className="text-3xl font-bold">
            ${campaign.impressions > 0
              ? ((campaignSpend / (campaign.impressions / 1000)).toFixed(2))
              : "0"}
          </p>
          <p className="mt-2 text-xs text-faint">
            {campaign.impressions.toLocaleString()} total impressions
          </p>
        </div>

        {/* Profitability */}
        <div
          className={`rounded-lg border p-4 ${
            profitability > 0
              ? "border-teal/30 bg-teal/15"
              : "border-coral/30 bg-coral/15"
          }`}
        >
          <p className="text-sm text-lo">Profit per $1 Spent</p>
          <p
            className={`text-3xl font-bold ${
              profitability > 0 ? "text-teal" : "text-coral"
            }`}
          >
            ${profitability.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-faint">
            {profitability > 0
              ? `Profitable: ${(profitability * 100).toFixed(0)}% ROI`
              : `Loss: ${(Math.abs(profitability) * 100).toFixed(0)}%`}
          </p>
        </div>
      </div>

      {/* Benchmarks */}
      <div className="rounded-lg bg-gold/10 p-4 border border-gold/40">
        <h3 className="font-semibold text-gold-hi mb-3">Efficiency Benchmarks</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gold-hi mb-1">
              Break-Even ROAS: <span className="font-semibold">{breakEven.toFixed(2)}x</span>
            </p>
            <p className="text-xs text-lo">
              Your campaign needs this ROAS to break even on COGS. Current: {contributionRoas.toFixed(2)}x
            </p>
          </div>
          <div>
            <p className="text-gold-hi mb-1">
              Max Sustainable CPA: <span className="font-semibold">${maxCpa.toFixed(2)}</span>
            </p>
            <p className="text-xs text-lo">
              Highest CPA that still generates profit. Current: ${cpa.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Spend Trend */}
      <div className="rounded-lg border border-line p-6">
        <h3 className="font-semibold mb-4">30-Day Spend Trend</h3>
        {campaign.spendDaily.length > 0 ? (
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-right">Spend</th>
                  <th className="px-3 py-2 text-right">Impressions</th>
                  <th className="px-3 py-2 text-right">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {campaign.spendDaily
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .slice(0, 10)
                  .map((day) => (
                    <tr key={day.id} className="border-b border-line hover:bg-white/5">
                      <td className="px-3 py-2">{day.date.toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        ${day.spend.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {day.impressions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right">{day.conversions}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-faint">No spend data yet. Campaign synced: {campaign.syncedAt?.toLocaleString()}</p>
        )}
      </div>

      {/* Budget Management */}
      <div className="rounded-lg border border-line p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Budget Management</h3>
          <BudgetEditor
            storeId={campaign.storeId}
            campaignId={campaign.id}
            metaCampaignId={campaign.metaCampaignId}
            currentBudget={campaign.dailyBudget?.toNumber() ?? 0}
          />
        </div>
        {campaign.dailyBudget && (
          <p className="text-sm text-lo">
            Current daily budget: <span className="font-medium">${campaign.dailyBudget.toFixed(2)}</span>
          </p>
        )}
      </div>

      {/* Ad Set Management */}
      <AdSetManager
        storeId={campaign.storeId}
        metaCampaignId={campaign.metaCampaignId}
        adSets={
          campaign.adSets?.map((adSet) => ({
            id: adSet.id,
            name: adSet.name,
            status: adSet.status,
            billingEvent: adSet.billingEvent,
            optimizationGoal: adSet.optimizationGoal,
            dailyBudget: adSet.dailyBudget?.toString(),
            creatives: adSet.creatives ?? [],
          })) ?? []
        }
      />

      {/* Attribution Note */}
      <div className="rounded-lg bg-white/5 p-4 border border-line">
        <p className="text-xs text-lo mb-2">
          <strong>Note on Revenue Attribution:</strong> This campaign detail page uses a spend-proportion heuristic
          to estimate revenue attribution (dividing store revenue by campaign spend %). For accuracy, configure UTM
          parameters on your Meta campaigns and track them in your orders to get true per-campaign attribution.
        </p>
      </div>
    </div>
  );
}
