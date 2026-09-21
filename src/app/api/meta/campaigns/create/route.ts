import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MetaClient, decryptToken } from "@/lib/meta/client";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * POST /api/meta/campaigns/create
 * Create and publish a new Meta campaign
 *
 * Called after review screen is approved by user.
 * Creates the campaign in Meta Ads Manager and stores it in EcomOS.
 *
 * Body (from wizard review):
 * - storeId: string
 * - campaignData: {
 *     name: string
 *     objective: string
 *     budget?: number (daily budget in cents)
 *   }
 * - reviewApproved: boolean (must be true)
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

    const { storeId, campaignData, reviewApproved } = await req.json();

    if (!storeId || !campaignData || !reviewApproved) {
      return NextResponse.json({ error: "Missing required fields or review not approved" }, { status: 400 });
    }

    if (!campaignData.name || !campaignData.objective) {
      return NextResponse.json({ error: "Campaign name and objective required" }, { status: 400 });
    }

    // Verify store access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get Meta account
    const metaAccount = await prisma.metaAccount.findFirst({
      where: { storeId },
    });

    if (!metaAccount) {
      return NextResponse.json({ error: "Meta account not connected" }, { status: 400 });
    }

    // Decrypt token
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY not set");
    }

    const accessToken = decryptToken(metaAccount.accessTokenEncrypted, encryptionKey);

    // Create campaign in Meta (starts paused)
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const metaResult = await metaClient.createCampaign(metaAccount.metaAccountId, accessToken, {
      name: campaignData.name,
      objective: campaignData.objective,
      status: "PAUSED", // Start paused, user must activate after setup
    });

    // Store campaign in EcomOS
    const campaign = await prisma.metaCampaign.create({
      data: {
        storeId,
        metaAccountId: metaAccount.id,
        metaCampaignId: metaResult.campaign_id,
        name: campaignData.name,
        status: "PAUSED",
        objective: campaignData.objective,
        totalSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        syncedAt: new Date(),
      },
    });

    // Log to audit trail
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: "meta_campaign_created",
        metadata: {
          campaignId: campaign.id,
          metaCampaignId: metaResult.campaign_id,
          campaignName: campaignData.name,
          objective: campaignData.objective,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      campaign: {
        id: campaign.id,
        metaCampaignId: metaResult.campaign_id,
        name: campaign.name,
        status: campaign.status,
        objective: campaign.objective,
        message: "Campaign created in PAUSED state. Edit ad sets and budget, then activate.",
      },
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return NextResponse.json(
      { error: "Failed to create campaign", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
