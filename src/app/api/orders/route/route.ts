import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { routeOrderLineItems, createSupplierOrdersFromRoutes } from "@/lib/orders/routing";
import { reportError } from "@/lib/alerts";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const grants = await loadStoreAccessGrants(user.id);
    const { orderId, storeId } = await request.json();

    if (!storeId || !orderId) {
      return NextResponse.json({ error: "orderId and storeId required" }, { status: 400 });
    }

    if (!hasCapability(grants, storeId, CAPABILITIES.storeSync)) {
      return NextResponse.json({ error: "No access to this store" }, { status: 403 });
    }

    // Verify order belongs to this store
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Route line items to suppliers
    const decisions = await routeOrderLineItems(orderId, prisma);

    // Create supplier orders
    await createSupplierOrdersFromRoutes(orderId, prisma);

    const supplierOrders = await prisma.supplierOrder.findMany({
      where: { orderId },
    });

    return NextResponse.json({
      orderId,
      routed: decisions.length,
      supplierOrders: supplierOrders.map((so) => ({
        id: so.id,
        supplier: so.supplier,
        status: so.status,
        totalCost: Number(so.totalCost),
        totalShipping: Number(so.totalShipping),
        estimatedMargin: Number(so.estimatedMargin),
      })),
    });
  } catch (error) {
    await reportError(error, { where: "Order routing error" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
