import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, approvalId, decision, rejectionReason } = await req.json();

  if (!storeId || !approvalId || !["approved", "rejected"].includes(decision)) {
    return NextResponse.json(
      { error: "Invalid parameters" },
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
    const approval = await prisma.approvalAction.findFirst({
      where: { id: approvalId, storeId },
    });

    if (!approval) {
      return NextResponse.json(
        { error: "Approval not found" },
        { status: 404 }
      );
    }

    if (approval.status !== "pending") {
      return NextResponse.json(
        { error: "Approval already processed" },
        { status: 400 }
      );
    }

    const updated = await prisma.approvalAction.update({
      where: { id: approvalId },
      data: {
        status: decision,
        approvedBy: user.id,
        approvedAt: new Date(),
        rejectionReason: decision === "rejected" ? rejectionReason : null,
      },
    });

    // TODO: Execute the action if approved (e.g., create campaign, update budget)
    // For now, just update the status

    return NextResponse.json({ approval: updated }, { status: 200 });
  } catch (error) {
    console.error("Approval decision error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decision failed" },
      { status: 500 }
    );
  }
}
