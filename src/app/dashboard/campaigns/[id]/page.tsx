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
import { getLocale, getT, tr } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n";

export async function generateMetadata() {
  return { title: await tr("campaignDetail.metaTitle") };
}

// Los enums de Meta llegan crudos desde la base de datos: se traducen por tabla
// y, si aparece uno nuevo, se muestra el valor crudo en vez de dejarlo vacío.
const OBJECTIVE_KEYS: Record<string, MessageKey> = {
  LINK_CLICKS: "objective.LINK_CLICKS",
  CONVERSIONS: "objective.CONVERSIONS",
  REACH: "objective.REACH",
  IMPRESSIONS: "objective.IMPRESSIONS",
  VIDEO_VIEWS: "objective.VIDEO_VIEWS",
};

const STATUS_KEYS: Record<string, MessageKey> = {
  ACTIVE: "campaignStatus.ACTIVE",
  PAUSED: "campaignStatus.PAUSED",
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();
  const locale = await getLocale();
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

  const objectiveKey = OBJECTIVE_KEYS[campaign.objective];
  const statusKey = STATUS_KEYS[campaign.status];

  return (
    <div className="space-y-8 p-8">
      {/* Header */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <a
            href="/dashboard/meta/campaigns"
            className="text-gold-hi hover:underline"
          >
            {t("campaignDetail.back")}
          </a>
        </div>
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <p className="mt-1 text-lo">{objectiveKey ? t(objectiveKey) : campaign.objective}</p>
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
            {statusKey ? t(statusKey) : campaign.status}
          </span>
          <span className="text-sm text-faint">
            {t("campaignDetail.lastSynced", {
              date: campaign.syncedAt?.toLocaleDateString(locale) || t("campaignDetail.never"),
            })}
          </span>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Spend */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">{t("campaignDetail.totalSpend")}</p>
          <p className="text-2xl font-bold">${campaignSpend.toFixed(2)}</p>
          <p className="mt-1 text-xs text-faint">
            {t("campaignDetail.impressions", {
              count: campaign.impressions.toLocaleString(locale),
            })}
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
          <p className="text-sm text-lo">{t("campaignDetail.revenueRoas")}</p>
          <p
            className={`text-2xl font-bold ${
              revenueRoas >= 1 ? "text-teal" : "text-coral"
            }`}
          >
            {revenueRoas.toFixed(2)}x
          </p>
          <p className="mt-1 text-xs text-faint">
            {t("campaignDetail.estRevenue", { value: campaignRevenue.toFixed(0) })}
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
          <p className="text-sm text-lo">{t("campaignDetail.contributionRoas")}</p>
          <p className="text-2xl font-bold text-gold-hi">{contributionRoas.toFixed(2)}x</p>
          <p className="mt-1 text-xs text-faint">
            {t("campaignDetail.estProfit", { value: campaignProfit.toFixed(0) })}
          </p>
        </div>

        {/* CPA */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">{t("campaignDetail.cpa")}</p>
          <p className="text-2xl font-bold">${cpa.toFixed(2)}</p>
          <p
            className={`mt-1 text-xs ${
              cpa <= maxCpa ? "text-teal" : "text-coral"
            }`}
          >
            {t("campaignDetail.maxSustainable", { value: maxCpa.toFixed(2) })}
          </p>
        </div>
      </div>

      {/* Campaign Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Conversions */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">{t("campaignDetail.conversions")}</p>
          <p className="text-3xl font-bold">{campaign.conversions}</p>
          <p className="mt-2 text-xs text-faint">
            {t("campaignDetail.convRate", {
              value:
                campaign.impressions > 0
                  ? ((campaign.conversions / campaign.impressions) * 100).toFixed(2)
                  : "0",
            })}
          </p>
        </div>

        {/* CPM */}
        <div className="rounded-lg border border-line p-4">
          <p className="text-sm text-lo">{t("campaignDetail.cpm")}</p>
          <p className="text-3xl font-bold">
            ${campaign.impressions > 0
              ? ((campaignSpend / (campaign.impressions / 1000)).toFixed(2))
              : "0"}
          </p>
          <p className="mt-2 text-xs text-faint">
            {t("campaignDetail.totalImpressions", {
              count: campaign.impressions.toLocaleString(locale),
            })}
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
          <p className="text-sm text-lo">{t("campaignDetail.profitPerDollar")}</p>
          <p
            className={`text-3xl font-bold ${
              profitability > 0 ? "text-teal" : "text-coral"
            }`}
          >
            ${profitability.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-faint">
            {profitability > 0
              ? t("campaignDetail.profitable", { value: (profitability * 100).toFixed(0) })
              : t("campaignDetail.loss", { value: (Math.abs(profitability) * 100).toFixed(0) })}
          </p>
        </div>
      </div>

      {/* Benchmarks */}
      <div className="rounded-lg bg-gold/10 p-4 border border-gold/40">
        <h3 className="font-semibold text-gold-hi mb-3">{t("campaignDetail.benchmarks")}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gold-hi mb-1">
              {t("campaignDetail.breakEvenRoas")}{" "}
              <span className="font-semibold">{breakEven.toFixed(2)}x</span>
            </p>
            <p className="text-xs text-lo">
              {t("campaignDetail.breakEvenHelp", { value: contributionRoas.toFixed(2) })}
            </p>
          </div>
          <div>
            <p className="text-gold-hi mb-1">
              {t("campaignDetail.maxCpaLabel")}{" "}
              <span className="font-semibold">${maxCpa.toFixed(2)}</span>
            </p>
            <p className="text-xs text-lo">
              {t("campaignDetail.maxCpaHelp", { value: cpa.toFixed(2) })}
            </p>
          </div>
        </div>
      </div>

      {/* Daily Spend Trend */}
      <div className="rounded-lg border border-line p-6">
        <h3 className="font-semibold mb-4">{t("campaignDetail.spendTrend")}</h3>
        {campaign.spendDaily.length > 0 ? (
          <div className="space-y-2">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left">{t("campaignDetail.colDate")}</th>
                  <th className="px-3 py-2 text-right">{t("campaignDetail.colSpend")}</th>
                  <th className="px-3 py-2 text-right">{t("campaignDetail.colImpressions")}</th>
                  <th className="px-3 py-2 text-right">{t("campaignDetail.colConversions")}</th>
                </tr>
              </thead>
              <tbody>
                {campaign.spendDaily
                  .sort((a, b) => b.date.getTime() - a.date.getTime())
                  .slice(0, 10)
                  .map((day) => (
                    <tr key={day.id} className="border-b border-line hover:bg-white/5">
                      <td className="px-3 py-2">{day.date.toLocaleDateString(locale)}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        ${day.spend.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {day.impressions.toLocaleString(locale)}
                      </td>
                      <td className="px-3 py-2 text-right">{day.conversions}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-faint">
            {t("campaignDetail.noSpend", {
              date: campaign.syncedAt?.toLocaleString(locale) ?? t("campaignDetail.never"),
            })}
          </p>
        )}
      </div>

      {/* Budget Management */}
      <div className="rounded-lg border border-line p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t("campaignDetail.budgetManagement")}</h3>
          <BudgetEditor
            storeId={campaign.storeId}
            campaignId={campaign.id}
            metaCampaignId={campaign.metaCampaignId}
            currentBudget={campaign.dailyBudget?.toNumber() ?? 0}
          />
        </div>
        {campaign.dailyBudget && (
          <p className="text-sm text-lo">
            {t("campaignDetail.currentBudget")}{" "}
            <span className="font-medium">${campaign.dailyBudget.toFixed(2)}</span>
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
          <strong>{t("campaignDetail.attributionLabel")}</strong>{" "}
          {t("campaignDetail.attribution")}
        </p>
      </div>
    </div>
  );
}
