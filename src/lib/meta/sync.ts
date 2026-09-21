import { prisma } from "@/lib/db";
import { MetaClient, decryptToken } from "./client";
import { rollupDailyMetaSpend } from "./rollup";

/**
 * Meta campaign sync service
 * Fetches campaigns and daily spend from Meta Graph API
 * Updates MetaCampaign and MetaSpendDaily tables
 */

export interface SyncResult {
  storeId: string;
  campaignsCreated: number;
  campaignsUpdated: number;
  spendDataPoints: number;
  errors: string[];
}

const SPEND_WINDOW_DAYS = 30;

export interface CampaignInsight {
  date_start: string;
  date_stop: string;
  spend: string;
  impressions: string;
  actions: Array<{ action_type: string; value: string }>;
}

function num(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** One insights row → the numbers a MetaSpendDaily row stores. */
export function perDay(insight: CampaignInsight) {
  return {
    date: new Date(insight.date_start),
    spend: num(insight.spend),
    impressions: Math.trunc(num(insight.impressions)),
    conversions: Math.trunc(
      num(insight.actions?.find((a) => a.action_type === "purchase")?.value)
    ),
  };
}

export function sumInsights(insights: CampaignInsight[]) {
  return insights.reduce(
    (acc, insight) => {
      const day = perDay(insight);
      return {
        spend: acc.spend + day.spend,
        impressions: acc.impressions + day.impressions,
        conversions: acc.conversions + day.conversions,
      };
    },
    { spend: 0, impressions: 0, conversions: 0 }
  );
}

/**
 * Sync campaigns for a single Meta account
 */
export async function syncMetaAccount(metaAccountId: string): Promise<SyncResult> {
  const result: SyncResult = {
    storeId: "",
    campaignsCreated: 0,
    campaignsUpdated: 0,
    spendDataPoints: 0,
    errors: [],
  };

  try {
    // Fetch Meta account
    const metaAccount = await prisma.metaAccount.findUniqueOrThrow({
      where: { id: metaAccountId },
    });

    result.storeId = metaAccount.storeId;

    // Decrypt access token
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY not configured");
    }

    const accessToken = decryptToken(metaAccount.accessTokenEncrypted, encryptionKey);

    // Create Meta client
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/auth/callback`,
    });

    // Fetch campaigns
    const campaigns = await metaClient.getCampaigns(
      metaAccount.metaAccountId,
      accessToken
    );

    console.log(`[Meta Sync] Found ${campaigns.length} campaigns for account ${metaAccountId}`);

    // Insights window. totalSpend/impressions/conversions are the rolling sum
    // over this window, not lifetime — the campaigns edge exposes no totals.
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - SPEND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const dateStart = thirtyDaysAgo.toISOString().split("T")[0];
    const dateStop = today.toISOString().split("T")[0];

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        // Insights first — the campaign row's totals are derived from them.
        let insights: CampaignInsight[] = [];
        let insightsOk = true;

        try {
          insights = await metaClient.getCampaignInsights(
            campaign.id,
            accessToken,
            dateStart,
            dateStop
          );
        } catch (error) {
          insightsOk = false;
          const msg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to fetch insights for campaign ${campaign.id}: ${msg}`);
          console.error(`[Meta Sync] Error fetching insights for ${campaign.id}:`, error);
        }

        const totals = sumInsights(insights);

        const existing = await prisma.metaCampaign.findUnique({
          where: {
            storeId_metaCampaignId: {
              storeId: metaAccount.storeId,
              metaCampaignId: campaign.id,
            },
          },
          select: { id: true },
        });

        const metadata = {
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          syncedAt: new Date(),
        };

        // On an insights failure keep the previously stored totals rather than
        // zeroing them — a transient API error shouldn't erase real spend.
        const derivedTotals = insightsOk
          ? {
              totalSpend: totals.spend,
              impressions: totals.impressions,
              conversions: totals.conversions,
            }
          : {};

        const stored = await prisma.metaCampaign.upsert({
          where: {
            storeId_metaCampaignId: {
              storeId: metaAccount.storeId,
              metaCampaignId: campaign.id,
            },
          },
          update: { ...metadata, ...derivedTotals },
          create: {
            storeId: metaAccount.storeId,
            metaAccountId: metaAccount.id,
            metaCampaignId: campaign.id,
            ...metadata,
            ...derivedTotals,
          },
          select: { id: true },
        });

        if (existing) result.campaignsUpdated++;
        else result.campaignsCreated++;

        // Store the daily rows behind those totals
        for (const insight of insights) {
          const day = perDay(insight);

          await prisma.metaSpendDaily.upsert({
            where: {
              metaCampaignId_date: {
                metaCampaignId: stored.id,
                date: day.date,
              },
            },
            update: {
              spend: day.spend,
              impressions: day.impressions,
              conversions: day.conversions,
            },
            create: {
              storeId: metaAccount.storeId,
              metaCampaignId: stored.id,
              date: day.date,
              spend: day.spend,
              impressions: day.impressions,
              conversions: day.conversions,
            },
          });

          result.spendDataPoints++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`Failed to sync campaign ${campaign.id}: ${msg}`);
        console.error(`[Meta Sync] Error syncing campaign ${campaign.id}:`, error);
      }
    }

    // Update last synced timestamp
    await prisma.metaAccount.update({
      where: { id: metaAccountId },
      data: { lastSyncedAt: new Date() },
    });

    console.log(`[Meta Sync] Completed for account ${metaAccountId}:`, result);
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    result.errors.push(`Fatal error during sync: ${msg}`);
    console.error(`[Meta Sync] Fatal error for account ${metaAccountId}:`, error);
    return result;
  }
}

/**
 * Sync all connected Meta accounts
 * Call this periodically (e.g., every 4 hours) via pg_cron
 */
export async function syncAllMetaAccounts(): Promise<void> {
  try {
    console.log("[Meta Sync] Starting sync of all accounts");

    // "error" is retried every run: a transient failure must not silence an account for good.
    // disconnected/expired need the user to reconnect, so those are left alone.
    const accounts = await prisma.metaAccount.findMany({
      where: { status: { in: ["connected", "error"] } },
    });

    console.log(`[Meta Sync] Found ${accounts.length} connected accounts`);

    const storesWithSync = new Set<string>();

    for (const account of accounts) {
      let result: SyncResult;
      try {
        result = await syncMetaAccount(account.id);
      } catch (err) {
        console.error(`[Meta Sync] Account ${account.id} failed:`, err);
        await prisma.metaAccount.update({ where: { id: account.id }, data: { status: "error" } });
        continue;
      }
      storesWithSync.add(account.storeId);

      const store = await prisma.store.findUniqueOrThrow({
        where: { id: account.storeId },
        select: { organizationId: true },
      });

      // Log to audit trail
      await prisma.auditLog.create({
        data: {
          organizationId: store.organizationId,
          storeId: account.storeId,
          action: "meta_sync_completed",
          metadata: {
            metaAccountId: account.id,
            campaignsCreated: result.campaignsCreated,
            campaignsUpdated: result.campaignsUpdated,
            spendDataPoints: result.spendDataPoints,
            errors: result.errors,
          },
        },
      });

      await prisma.metaAccount.update({
        where: { id: account.id },
        data: { status: result.errors.length > 0 ? "error" : "connected" },
      });
    }

    // Rollup daily spend for all stores that synced
    console.log("[Meta Sync] Running spend rollup...");
    for (const storeId of storesWithSync) {
      try {
        const rollupResult = await rollupDailyMetaSpend(storeId);
        console.log(`[Meta Sync] Rollup complete for store: ${rollupResult.datesProcessed} dates`);
      } catch (error) {
        console.error(`[Meta Sync] Rollup failed for store ${storeId}:`, error);
      }
    }

    console.log("[Meta Sync] All accounts synced and rolled up");
  } catch (error) {
    console.error("[Meta Sync] Fatal error syncing all accounts:", error);
    throw error;
  }
}
