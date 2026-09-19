import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { attributeOrders } from "@/lib/meta/attribution";
import { prisma } from "@/lib/db";

/**
 * POST /api/campaigns/attribute
 *
 * Attribute unattributed orders to Meta campaigns via utm_campaign extraction.
 * Requires store:write capability (Manager+).
 *
 * Query params:
 * - storeId: store to attribute orders for
 */
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    // Verify auth + capability
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeWrite)) {
      return NextResponse.json({ error: "No write access to this store" }, { status: 403 });
    }

    // Check store exists
    const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });

    console.log(`[Attribution API] Starting attribution for store: ${store.name}`);

    // Run attribution
    const result = await attributeOrders(storeId);

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        organizationId: store.organizationId,
        userId: user.id,
        storeId,
        action: "order_attribution_run",
        metadata: result,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Order attribution completed",
      result,
    });
  } catch (error) {
    console.error("[Attribution API] Error:", error);
    return NextResponse.json(
      { error: "Attribution failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
