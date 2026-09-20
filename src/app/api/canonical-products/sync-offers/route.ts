import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { supplierRegistry } from "@/lib/suppliers/registry";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { canonicalProductId, storeId } = await req.json();

    // Check access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
      return NextResponse.json({ error: "No access to this store" }, { status: 403 });
    }

    // Sync offers for all suppliers
    const suppliers = ["autods", "spocket", "printful", "zendrop"] as const;
    for (const supplier of suppliers) {
      await supplierRegistry.syncOffer(canonicalProductId, supplier, prisma);
    }

    const offers = await prisma.supplierOffer.findMany({
      where: { canonicalProductId },
    });

    return NextResponse.json({ success: true, offers });
  } catch (error) {
    console.error("Error syncing offers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
