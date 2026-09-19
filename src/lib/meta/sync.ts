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

    // Process each campaign
    for (const campaign of campaigns) {
      try {
        // Parse spend and metrics
        const spend = parseFloat(campaign.spend || "0");
        const impressions = parseInt(campaign.impressions || "0");
        const conversions = campaign.actions
          ?.find((a) => a.action_type === "purchase")
          ?.value || "0";

        // Upsert campaign
        const existing = await prisma.metaCampaign.findFirst({
          where: {
            storeId: metaAccount.storeId,
            metaCampaignId: campaign.id,
          },
        });

        if (existing) {
          await prisma.metaCampaign.update({
            where: { id: existing.id },
            data: {
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              totalSpend: spend,
              impressions,
              conversions: parseInt(conversions),
              syncedAt: new Date(),
            },
          });
          result.campaignsUpdated++;
        } else {
          await prisma.metaCampaign.create({
            data: {
              storeId: metaAccount.storeId,
              metaAccountId: metaAccount.id,
              metaCampaignId: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              totalSpend: spend,
              impressions,
              conversions: parseInt(conversions),
              syncedAt: new Date(),
            },
          });
          result.campaignsCreated++;
        }

        // Fetch and store daily insights (last 30 days)
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const dateStart = thirtyDaysAgo.toISOString().split("T")[0];
        const dateStop = today.toISOString().split("T")[0];

        try {
          const insights = await metaClient.getCampaignInsights(
            campaign.id,
            accessToken,
            dateStart,
            dateStop
          );

          for (const insight of insights) {
            const spendValue = parseFloat(insight.spend || "0");
            const impressionsValue = parseInt(insight.impressions || "0");
            const conversionsValue = insight.actions
              ?.find((a) => a.action_type === "purchase")
              ?.value || "0";

            // Upsert daily spend
            await prisma.metaSpendDaily.upsert({
              where: {
                metaCampaignId_date: {
                  metaCampaignId: existing?.id || (await prisma.metaCampaign.findUniqueOrThrow({
                    where: {
                      storeId_metaCampaignId: {
                        storeId: metaAccount.storeId,
                        metaCampaignId: campaign.id,
                      },
                    },
                  })).id,
                  date: new Date(insight.date_start),
                },
              },
              update: {
                spend: spendValue,
                impressions: impressionsValue,
                conversions: parseInt(conversionsValue),
              },
              create: {
                storeId: metaAccount.storeId,
                metaCampaignId: existing?.id || (await prisma.metaCampaign.findUniqueOrThrow({
                  where: {
                    storeId_metaCampaignId: {
                      storeId: metaAccount.storeId,
                      metaCampaignId: campaign.id,
                    },
                  },
                })).id,
                date: new Date(insight.date_start),
                spend: spendValue,
                impressions: impressionsValue,
                conversions: parseInt(conversionsValue),
              },
            });

            result.spendDataPoints++;
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          result.errors.push(`Failed to fetch insights for campaign ${campaign.id}: ${msg}`);
          console.error(`[Meta Sync] Error fetching insights for ${campaign.id}:`, error);
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

    const accounts = await prisma.metaAccount.findMany({
      where: { status: "connected" },
    });

    console.log(`[Meta Sync] Found ${accounts.length} connected accounts`);

    const storesWithSync = new Set<string>();

    for (const account of accounts) {
      const result = await syncMetaAccount(account.id);
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

      // If there were errors, update status
      if (result.errors.length > 0) {
        await prisma.metaAccount.update({
          where: { id: account.id },
          data: { status: "error" },
        });
      }
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
