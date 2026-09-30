import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * POST /api/products/delete
 * Hard-delete a product from EcomOS. Cascades to variants, supplier links,
 * inventory levels, AI copy and creative ideas. Order line items keep their
 * historical rows with `variantId` set to null so revenue math stays intact.
 *
 * Note: this only removes the EcomOS mirror. If the product still exists in
 * Shopify, the next sync will re-create it. Delete or archive in Shopify first
 * for a permanent removal.
 *
 * Body: { storeId, productId }
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, productId } = await req.json();
  if (!storeId || !productId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.productsManage)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    select: { id: true, title: true, shopifyGid: true, store: { select: { organizationId: true } } },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const result = await prisma.product.deleteMany({ where: { id: productId, storeId } });
  if (result.count === 0) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: product.store.organizationId,
      userId: user.id,
      storeId,
      action: "product_deleted",
      metadata: { productId, shopifyGid: product.shopifyGid, title: product.title },
    },
  });

  return NextResponse.json({ ok: true });
}
