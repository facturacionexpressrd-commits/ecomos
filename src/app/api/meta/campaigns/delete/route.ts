import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { actionFailure, deleteCampaign } from "@/lib/meta/actions";
import { reportError } from "@/lib/alerts";

/**
 * POST /api/meta/campaigns/delete
 * Delete a Meta campaign in Meta and cascade-remove its EcomOS row.
 * Body: { storeId, campaignId (EcomOS id) }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, campaignId } = await req.json();
  if (!storeId || !campaignId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

  let metaCampaignId: string;
  try {
    ({ metaCampaignId } = await deleteCampaign({ storeId, campaignId }));
  } catch (error) {
    const { status, message } = actionFailure(error);
    if (status >= 500) await reportError(error, { where: "Error deleting campaign" });
    return NextResponse.json({ error: message }, { status });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: store.organizationId,
      userId: user.id,
      storeId,
      action: "meta_campaign_deleted",
      metadata: { campaignId, metaCampaignId },
    },
  });

  return NextResponse.json({ ok: true });
}
