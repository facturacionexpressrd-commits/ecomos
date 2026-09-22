import { prisma } from "@/lib/db";
import { ExecutiveAssistant, WithheldExplanationError } from "./executive-assistant";
import { NotificationService } from "@/lib/notifications/service";
import { CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";

const LOOKBACK_DAYS = 7;
const MIN_SPEND_TO_FLAG = 20; // USD, over the lookback window
const BUDGET_STEP = 0.2; // ±20%
const UNDERPERFORM_RATIO = 0.7; // "meaningfully better" than the account's own average CPA

type CampaignPerf = {
  campaignId: string;
  campaignName: string;
  adSetId: string;
  currentBudgetCents: number;
  spend: number;
  conversions: number;
  cpa: number | null;
};

/**
 * Looks at each store's own Meta spend data from the last week and proposes budget changes for
 * campaigns that are either burning spend with zero conversions or meaningfully outperforming the
 * account's own average cost-per-conversion. Only touches campaigns with exactly one ad set, since
 * that's the only case `setCampaignBudget` (the approval's executor) can act on unambiguously.
 */
export async function generateApprovalRecommendations(): Promise<{ created: number }> {
  const stores = await prisma.store.findMany({
    where: { metaAccounts: { some: {} } },
    select: { id: true },
  });

  let created = 0;
  for (const store of stores) {
    created += await recommendBudgetChanges(store.id);
  }
  return { created };
}

async function recommendBudgetChanges(storeId: string): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const campaigns = await prisma.metaCampaign.findMany({
    where: { storeId, status: "ACTIVE" },
    include: { adSets: true, spendDaily: { where: { date: { gte: since } } } },
  });

  const perf: CampaignPerf[] = campaigns
    .filter((c) => c.adSets.length === 1 && c.adSets[0].dailyBudget)
    .map((c) => {
      const spend = c.spendDaily.reduce((s, d) => s + Number(d.spend), 0);
      const conversions = c.spendDaily.reduce((s, d) => s + d.conversions, 0);
      return {
        campaignId: c.id,
        campaignName: c.name,
        adSetId: c.adSets[0].id,
        currentBudgetCents: Number(c.adSets[0].dailyBudget),
        spend,
        conversions,
        cpa: conversions > 0 ? spend / conversions : null,
      };
    });

  const withConversions = perf.filter((p) => p.cpa !== null);
  const avgCpa =
    withConversions.length > 0
      ? withConversions.reduce((s, p) => s + p.cpa!, 0) / withConversions.length
      : null;

  let created = 0;
  for (const p of perf) {
    const alreadyPending = await prisma.approvalAction.findFirst({
      where: {
        storeId,
        actionType: "budget_update",
        status: "pending",
        data: { path: ["campaignId"], equals: p.campaignId },
      },
      select: { id: true },
    });
    if (alreadyPending) continue;

    if (p.conversions === 0 && p.spend >= MIN_SPEND_TO_FLAG) {
      await createRecommendation(storeId, p, -BUDGET_STEP, {
        reason: "no_conversions",
        spendUsd: Math.round(p.spend * 100) / 100,
      });
      created++;
    } else if (avgCpa !== null && p.cpa !== null && p.cpa < avgCpa * UNDERPERFORM_RATIO && withConversions.length > 1) {
      await createRecommendation(storeId, p, BUDGET_STEP, {
        reason: "below_average_cpa",
        cpaUsd: Math.round(p.cpa * 100) / 100,
        avgCpaUsd: Math.round(avgCpa * 100) / 100,
      });
      created++;
    }
  }
  return created;
}

async function createRecommendation(
  storeId: string,
  p: CampaignPerf,
  changeRatio: number,
  context: { reason: "no_conversions" | "below_average_cpa"; spendUsd?: number; cpaUsd?: number; avgCpaUsd?: number }
) {
  const newBudgetCents = Math.max(100, Math.round(p.currentBudgetCents * (1 + changeRatio)));
  const direction = changeRatio > 0 ? "Increase" : "Decrease";
  const title = `${direction} budget on "${p.campaignName}"`;

  const description =
    context.reason === "no_conversions"
      ? `This campaign spent $${context.spendUsd} over the last ${LOOKBACK_DAYS} days with zero tracked conversions. Recommending a ${Math.round(Math.abs(changeRatio) * 100)}% budget cut to limit further wasted spend.`
      : `This campaign's cost per conversion ($${context.cpaUsd}) is well below the account's ${LOOKBACK_DAYS}-day average ($${context.avgCpaUsd}). Recommending a ${Math.round(changeRatio * 100)}% budget increase to capture more of this demand.`;

  const reasoning =
    context.reason === "no_conversions"
      ? `Spend of $${context.spendUsd} with 0 conversions over ${LOOKBACK_DAYS} days exceeds the $${MIN_SPEND_TO_FLAG} threshold for flagging a campaign as underperforming.`
      : `CPA of $${context.cpaUsd} is ${Math.round((1 - context.cpaUsd! / context.avgCpaUsd!) * 100)}% below the account average of $${context.avgCpaUsd}, computed from this store's own ${LOOKBACK_DAYS}-day Meta spend data.`;

  const data = {
    campaignId: p.campaignId,
    adSetId: p.adSetId,
    dailyBudgetCents: newBudgetCents,
    previousBudgetCents: p.currentBudgetCents,
  };

  const financialImpact = Math.round(((newBudgetCents - p.currentBudgetCents) / 100) * 30 * 100) / 100; // ~monthly delta
  const confidenceScore = context.reason === "no_conversions" ? 0.75 : 0.65;

  const explanation = await buildExplanation({
    title,
    description,
    reasoning,
    confidenceScore,
    data,
    financialImpact,
  });

  await prisma.approvalAction.create({
    data: {
      storeId,
      actionType: "budget_update",
      title,
      description,
      data,
      priority: context.reason === "no_conversions" ? "high" : "medium",
      confidenceScore,
      reasoning,
      executiveExplanation: explanation,
      createdBy: "system:budget-recommender",
    },
  });

  await notifyApprovers(storeId, title);
}

async function buildExplanation(input: {
  title: string;
  description: string;
  reasoning: string;
  confidenceScore: number;
  data: Record<string, unknown>;
  financialImpact: number;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    try {
      const assistant = new ExecutiveAssistant(apiKey);
      return await assistant.generateExplanation({
        actionType: "budget_update",
        title: input.title,
        description: input.description,
        confidenceScore: input.confidenceScore,
        reasoning: input.reasoning,
        data: input.data,
        estimatedImpact: { financialImpact: input.financialImpact, riskLevel: "low" },
      });
    } catch (err) {
      if (!(err instanceof WithheldExplanationError)) {
        await reportError(err, { where: "buildExplanation" });
      }
    }
  }
  // No AI configured, or it withheld a claim it couldn't back — the description above is
  // already fact-only, so it's a safe fallback rather than blocking the recommendation.
  return input.description;
}

async function notifyApprovers(storeId: string, title: string) {
  const approvers = await prisma.userStoreAccess.findMany({
    where: { storeId, role: { capabilities: { has: CAPABILITIES.approvalsDecide } } },
    select: { userId: true },
  });
  for (const { userId } of approvers) {
    await NotificationService.notify(storeId, userId, "approval_pending", "New approval waiting", title);
  }
}
