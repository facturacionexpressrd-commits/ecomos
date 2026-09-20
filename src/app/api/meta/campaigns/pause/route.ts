import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MetaClient, decryptToken } from "@/lib/meta/client";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * POST /api/meta/campaigns/pause
 * Pause a Meta campaign
 *
 * Body:
 * - storeId: string
 * - campaignId: string (EcomOS campaign ID)
 * - metaCampaignId: string (Meta's campaign ID)
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

    const { storeId, campaignId, metaCampaignId } = await req.json();

    if (!storeId || !metaCampaignId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify store access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
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

    // Pause campaign in Meta
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    await metaClient.updateCampaign(metaCampaignId, accessToken, { status: "PAUSED" });

    // Update campaign status locally
    await prisma.metaCampaign.update({
      where: { id: campaignId },
      data: { status: "PAUSED" },
    });

    // Log to audit trail
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: "meta_campaign_paused",
        metadata: { campaignId, metaCampaignId },
      },
    });

    return NextResponse.json({ ok: true, status: "PAUSED" });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return NextResponse.json(
      { error: "Failed to pause campaign", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
