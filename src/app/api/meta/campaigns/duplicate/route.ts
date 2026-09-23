import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MetaClient, decryptToken } from "@/lib/meta/client";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";
import { ACTIVE_META } from "@/lib/meta/status";

/**
 * POST /api/meta/campaigns/duplicate
 * Duplicate a Meta campaign (creates paused copy)
 *
 * Body:
 * - storeId: string
 * - campaignId: string (EcomOS campaign ID to duplicate)
 * - metaCampaignId: string (Meta's campaign ID)
 * - newName: string (optional, defaults to "Copy of {original name}")
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

    const { storeId, campaignId, metaCampaignId, newName } = await req.json();

    if (!storeId || !campaignId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify store access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get original campaign
    const campaign = await prisma.metaCampaign.findFirst({
      where: { id: campaignId, storeId },
    });
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Get Meta account
    const metaAccount = await prisma.metaAccount.findFirst({ where: { storeId, ...ACTIVE_META } });

    if (!metaAccount) {
      return NextResponse.json({ error: "Meta account not connected" }, { status: 400 });
    }

    // Decrypt token
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY not set");
    }

    const accessToken = decryptToken(metaAccount.accessTokenEncrypted, encryptionKey);

    // Create new campaign in Meta (paused by default)
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const newCampaignName = newName || `Copy of ${campaign.name}`;
    const result = await metaClient.createCampaign(metaAccount.metaAccountId, accessToken, {
      name: newCampaignName,
      objective: campaign.objective,
      status: "PAUSED",
    });

    // Store new campaign in DB
    const newCampaign = await prisma.metaCampaign.create({
      data: {
        storeId,
        metaAccountId: metaAccount.id,
        metaCampaignId: result.campaign_id,
        name: newCampaignName,
        status: "PAUSED",
        objective: campaign.objective,
        totalSpend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
      },
    });

    // Log to audit trail
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: "meta_campaign_duplicated",
        metadata: {
          originalCampaignId: campaignId,
          originalMetaCampaignId: metaCampaignId,
          newCampaignId: newCampaign.id,
          newMetaCampaignId: result.campaign_id,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      campaign: {
        id: newCampaign.id,
        metaCampaignId: result.campaign_id,
        name: newCampaignName,
        status: "PAUSED",
      },
    });
  } catch (error) {
    await reportError(error, { where: "Error duplicating campaign" });
    return NextResponse.json(
      { error: "Failed to duplicate campaign", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
