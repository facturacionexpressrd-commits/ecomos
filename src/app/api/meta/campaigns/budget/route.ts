import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { actionFailure, setCampaignBudget } from "@/lib/meta/actions";

/**
 * PATCH /api/meta/campaigns/budget
 * Set a campaign's daily budget on Meta. Budgets live on ad sets, so this updates the
 * campaign's ad set; a campaign with several must say which via `adSetId`.
 *
 * Body: { storeId, campaignId (EcomOS id), dailyBudget (whole cents), adSetId? }
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, campaignId, dailyBudget, adSetId } = await req.json();
  if (!storeId || !campaignId || dailyBudget === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    await setCampaignBudget({ storeId, campaignId, dailyBudgetCents: dailyBudget, adSetId });
  } catch (error) {
    const { status, message } = actionFailure(error);
    console.error("Error updating budget:", error);
    return NextResponse.json({ error: message }, { status });
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  await prisma.auditLog.create({
    data: {
      organizationId: store.organizationId,
      userId: user.id,
      storeId,
      action: "meta_campaign_budget_updated",
      metadata: { campaignId, adSetId: adSetId ?? null, dailyBudgetCents: dailyBudget },
    },
  });

  return NextResponse.json({ ok: true, dailyBudget });
}
