import { prisma } from "@/lib/db";
import { MetaClient, decryptToken } from "@/lib/meta/client";
import { ACTIVE_META } from "@/lib/meta/status";

export class MetaActionError extends Error {
  constructor(
    message: string,
    readonly kind: "not_found" | "invalid" | "not_connected" | "ambiguous"
  ) {
    super(message);
  }
}

const HTTP_STATUS = { not_found: 404, invalid: 400, not_connected: 400, ambiguous: 409 } as const;

/** Maps an action failure to an HTTP status; anything that isn't ours came from Meta or the DB. */
export function actionFailure(error: unknown): { status: number; message: string } {
  if (error instanceof MetaActionError) return { status: HTTP_STATUS[error.kind], message: error.message };
  return { status: 502, message: error instanceof Error ? error.message : String(error) };
}

async function connect(storeId: string, campaignId: string) {
  // Everything is derived from the database and scoped to the store; the request's own
  // notion of which Meta campaign to touch is never trusted.
  const campaign = await prisma.metaCampaign.findFirst({
    where: { id: campaignId, storeId },
    include: { adSets: true },
  });
  if (!campaign) throw new MetaActionError("Campaign not found", "not_found");

  const account = await prisma.metaAccount.findFirst({ where: { storeId, ...ACTIVE_META } });
  if (!account) throw new MetaActionError("Meta account not connected", "not_connected");

  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY not set");

  const client = new MetaClient({
    appId: process.env.META_APP_ID || "",
    appSecret: process.env.META_APP_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/auth/callback`,
  });
  return { campaign, client, token: decryptToken(account.accessTokenEncrypted, key) };
}

export async function setCampaignStatus(input: {
  storeId: string;
  campaignId: string;
  status: "ACTIVE" | "PAUSED";
}) {
  const { campaign, client, token } = await connect(input.storeId, input.campaignId);
  await client.updateCampaign(campaign.metaCampaignId, token, { status: input.status });
  await prisma.metaCampaign.update({ where: { id: campaign.id }, data: { status: input.status } });
  return { metaCampaignId: campaign.metaCampaignId };
}

/**
 * Budgets live on ad sets: EcomOS creates campaigns without a campaign-level budget, so Meta
 * would reject one. With several ad sets the caller must say which; splitting money across
 * them would be a guess.
 */
export async function setCampaignBudget(input: {
  storeId: string;
  campaignId: string;
  dailyBudgetCents: number;
  adSetId?: string;
}) {
  const { dailyBudgetCents, adSetId } = input;
  if (!Number.isInteger(dailyBudgetCents) || dailyBudgetCents <= 0) {
    throw new MetaActionError("Daily budget must be a positive whole number of cents", "invalid");
  }

  const { campaign, client, token } = await connect(input.storeId, input.campaignId);

  const targets = adSetId ? campaign.adSets.filter((a) => a.id === adSetId) : campaign.adSets;
  if (adSetId && targets.length === 0) throw new MetaActionError("Ad set not found on this campaign", "not_found");
  if (targets.length === 0) {
    throw new MetaActionError("This campaign has no ad sets yet; create one first, budgets are set per ad set", "invalid");
  }
  if (targets.length > 1) {
    throw new MetaActionError(`This campaign has ${targets.length} ad sets; set the budget on a specific ad set`, "ambiguous");
  }

  const adSet = targets[0];
  await client.updateAdSet(adSet.metaAdSetId, token, { daily_budget: dailyBudgetCents });

  await prisma.metaAdSet.update({ where: { id: adSet.id }, data: { dailyBudget: dailyBudgetCents } });
  // MetaCampaign.dailyBudget is shown in dollars (ad sets store cents); it mirrors the only ad set.
  if (campaign.adSets.length === 1) {
    await prisma.metaCampaign.update({ where: { id: campaign.id }, data: { dailyBudget: dailyBudgetCents / 100 } });
  }
  return { metaAdSetId: adSet.metaAdSetId };
}
