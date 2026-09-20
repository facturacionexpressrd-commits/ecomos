import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

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
  const access = await prisma.userStoreAccess.findFirst({
    where: { userId: user.id, storeId },
  });

  if (!access) {
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
    console.error("Approval list error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list approvals" },
      { status: 500 }
    );
  }
}
