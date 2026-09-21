import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/alerts";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = req.nextUrl.searchParams.get("storeId");
  const status = req.nextUrl.searchParams.get("status") || "pending";

  if (!storeId) {
    return NextResponse.json(
      { error: "storeId required" },
      { status: 400 }
    );
  }

  // Verify user has access
  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const approvals = await prisma.approvalAction.findMany({
      where: {
        storeId,
        status: status as "pending" | "approved" | "rejected",
      },
      orderBy: [
        { priority: "desc" }, // critical first
        { createdAt: "desc" }, // newest first
      ],
      take: 50,
    });

    return NextResponse.json({ approvals }, { status: 200 });
  } catch (error) {
    await reportError(error, { where: "Approval list error" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list approvals" },
      { status: 500 }
    );
  }
}
