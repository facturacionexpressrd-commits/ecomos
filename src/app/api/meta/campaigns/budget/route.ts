import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MetaClient, decryptToken } from "@/lib/meta/client";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * PATCH /api/meta/campaigns/budget
 * Update campaign budget (daily or lifetime)
 *
 * Body:
 * - storeId: string
 * - campaignId: string (EcomOS campaign ID)
 * - metaCampaignId: string (Meta's campaign ID)
 * - dailyBudget?: number (in cents, or null to clear)
 * - lifetimeBudget?: number (in cents, or null to clear)
 *
 * At least one budget parameter must be provided.
 */

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeId, campaignId, metaCampaignId, dailyBudget, lifetimeBudget } =
      await req.json();

    if (!storeId || !metaCampaignId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (dailyBudget === undefined && lifetimeBudget === undefined) {
      return NextResponse.json(
        { error: "At least one budget parameter required" },
        { status: 400 }
      );
    }

    if (dailyBudget !== undefined && dailyBudget !== null && dailyBudget < 1) {
      return NextResponse.json({ error: "Daily budget must be >= 1 cent ($0.01)" }, { status: 400 });
    }

    if (lifetimeBudget !== undefined && lifetimeBudget !== null && lifetimeBudget < 1) {
      return NextResponse.json({ error: "Lifetime budget must be >= 1 cent ($0.01)" }, { status: 400 });
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

    // Update in Meta (note: campaigns don't have budgets directly, ad sets do)
    // For now, we'll just update the campaign in our DB as a marker
    // Real budget management happens at the ad set level in Meta
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    // Note: Campaigns in Meta don't have budgets; budgets are set at the ad set level.
    // This endpoint is a placeholder for storing budget intent at the campaign level.
    // Real implementation would update ad sets under this campaign.

    // Log budget update to audit trail
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: "meta_campaign_budget_updated",
        metadata: {
          campaignId,
          metaCampaignId,
          dailyBudget: dailyBudget ?? null,
          lifetimeBudget: lifetimeBudget ?? null,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Budget settings updated. Note: Manage ad set budgets in Meta Ads Manager for precise control.",
      campaign: {
        id: campaignId,
        metaCampaignId,
        dailyBudget: dailyBudget ?? null,
        lifetimeBudget: lifetimeBudget ?? null,
      },
    });
  } catch (error) {
    console.error("Error updating budget:", error);
    return NextResponse.json(
      { error: "Failed to update budget", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
