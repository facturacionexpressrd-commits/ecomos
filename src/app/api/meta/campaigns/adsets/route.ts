import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MetaClient, decryptToken } from "@/lib/meta/client";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";
import { ACTIVE_META } from "@/lib/meta/status";

/**
 * POST /api/meta/campaigns/adsets
 * Create a new ad set within a campaign
 *
 * Body:
 * - storeId: string
 * - metaCampaignId: string (Meta's campaign ID)
 * - adSetData: {
 *     name: string
 *     daily_budget?: number (in cents)
 *     lifetime_budget?: number (in cents)
 *     billing_event: string (IMPRESSIONS, CLICKS, CONVERSIONS)
 *     optimization_goal: string (REACH, IMPRESSIONS, LINK_CLICKS, CONVERSIONS)
 *     targeting: object (Meta targeting spec)
 *     start_time?: number (unix timestamp)
 *     end_time?: number (unix timestamp)
 *   }
 *
 * Returns: { ok, adSet }
 */

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, metaCampaignId, adSetData } = await req.json();

    if (!storeId || !metaCampaignId || !adSetData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!adSetData.name || !adSetData.billing_event || !adSetData.optimization_goal) {
      return NextResponse.json(
        { error: "Ad set name, billing_event, and optimization_goal required" },
        { status: 400 }
      );
    }

    // Verify store access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get Meta account
    const metaAccount = await prisma.metaAccount.findFirst({ where: { storeId, ...ACTIVE_META } });

    if (!metaAccount) {
      return NextResponse.json({ error: "Meta account not connected" }, { status: 400 });
    }

    // Get campaign
    const campaign = await prisma.metaCampaign.findFirst({
      where: { storeId, metaCampaignId },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Decrypt token
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY not set");
    }

    const accessToken = decryptToken(metaAccount.accessTokenEncrypted, encryptionKey);

    // Create ad set in Meta
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const metaResult = await metaClient.createAdSet(metaAccount.metaAccountId, accessToken, {
      name: adSetData.name,
      campaign_id: metaCampaignId,
      daily_budget: adSetData.daily_budget,
      lifetime_budget: adSetData.lifetime_budget,
      billing_event: adSetData.billing_event,
      optimization_goal: adSetData.optimization_goal,
      targeting: adSetData.targeting || {}, // Default empty targeting
      start_time: adSetData.start_time,
      end_time: adSetData.end_time,
      status: "PAUSED", // Always start paused
    });

    // Store ad set in EcomOS
    const adSet = await prisma.metaAdSet.create({
      data: {
        storeId,
        metaCampaignId: campaign.id,
        metaAdSetId: metaResult.adset_id,
        name: adSetData.name,
        status: "PAUSED",
        dailyBudget: adSetData.daily_budget ? adSetData.daily_budget : null,
        lifetimeBudget: adSetData.lifetime_budget ? adSetData.lifetime_budget : null,
        billingEvent: adSetData.billing_event,
        optimizationGoal: adSetData.optimization_goal,
        targeting: adSetData.targeting || {},
        startTime: adSetData.start_time ? new Date(adSetData.start_time * 1000) : null,
        endTime: adSetData.end_time ? new Date(adSetData.end_time * 1000) : null,
      },
    });

    // Log to audit trail
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: "meta_adset_created",
        metadata: {
          adSetId: adSet.id,
          metaAdSetId: metaResult.adset_id,
          metaCampaignId,
          adSetName: adSetData.name,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      adSet: {
        id: adSet.id,
        metaAdSetId: metaResult.adset_id,
        name: adSet.name,
        status: adSet.status,
        billingEvent: adSet.billingEvent,
        optimizationGoal: adSet.optimizationGoal,
        message: "Ad set created in PAUSED state. Add creatives and then activate.",
      },
    });
  } catch (error) {
    await reportError(error, { where: "Error creating ad set" });
    return NextResponse.json(
      { error: "Failed to create ad set", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
