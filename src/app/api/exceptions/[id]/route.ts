import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const grants = await loadStoreAccessGrants(user.id);
    const { storeId, isResolved, recommendedAction } = await request.json();

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    if (!hasCapability(grants, storeId, CAPABILITIES.storeSync)) {
      return NextResponse.json({ error: "No access to this store" }, { status: 403 });
    }

    // Verify exception belongs to this store
    const exception = await prisma.fulfillmentException.findFirst({
      where: {
        id,
        supplierOrder: { storeId },
      },
    });

    if (!exception) {
      return NextResponse.json({ error: "Exception not found" }, { status: 404 });
    }

    // Update exception
    const updated = await prisma.fulfillmentException.update({
      where: { id },
      data: {
        isResolved: isResolved ?? exception.isResolved,
        recommendedAction: recommendedAction ?? exception.recommendedAction,
        ...(isResolved && { resolvedAt: new Date(), resolvedBy: user.id }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    await reportError(error, { where: "Exception update error" });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
