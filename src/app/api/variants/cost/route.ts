import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { variantId, storeId, cost } = await req.json();

    // Check access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
      return NextResponse.json({ error: "No access to this store" }, { status: 403 });
    }

    // Verify variant belongs to store
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, storeId },
    });

    if (!variant) {
      return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    }

    // Update cost
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { cost: cost ? parseFloat(cost) : null },
    });

    // Look up user's organization (via store access)
    const access = await prisma.userStoreAccess.findFirst({
      where: { userId: user.id, storeId },
      select: { store: { select: { organizationId: true } } },
    });

    if (!access) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        organizationId: access.store.organizationId,
        userId: user.id,
        storeId,
        action: "variant_cost_updated",
        metadata: {
          variantId,
          newCost: cost,
          sku: variant.sku,
        },
      },
    });

    return NextResponse.json({ success: true, variant: updated });
  } catch (error) {
    console.error("Error updating variant cost:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
