import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * Form POST from the Integrations page. Wipes the stored Meta token and marks the account
 * disconnected; campaigns and spend history stay so past ROAS and profit figures still add up.
 * Reconnecting the same business refreshes this row (see connectAdAccount).
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const storeId = String(form.get("storeId") ?? "");
  const back = (q: string) =>
    NextResponse.redirect(new URL(`/dashboard/integrations?store=${encodeURIComponent(storeId)}&${q}`, req.url), 303);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);

  const grants = await loadStoreAccessGrants(user.id);
  if (!storeId || !hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
    return back("meta_error=forbidden");
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { organizationId: true } });
  const { count } = await prisma.metaAccount.updateMany({
    where: { storeId },
    data: { status: "disconnected", accessTokenEncrypted: "" },
  });
  if (count > 0) {
    await prisma.auditLog.create({
      data: { organizationId: store.organizationId, userId: user.id, storeId, action: "meta_account_disconnected" },
    });
  }
  return back("meta=disconnected");
}
