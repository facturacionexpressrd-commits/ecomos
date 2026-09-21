import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { CAPABILITIES, hasCapability, loadStoreAccessGrants } from "@/lib/auth/capabilities";
import { decideApproval } from "@/lib/approval/decide";
import { reportError } from "@/lib/alerts";

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
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  // Approving can spend money or change prices, so it needs its own capability, not just store access.
  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.approvalsDecide)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const result = await decideApproval({ storeId, approvalId, userId: user.id, decision, rejectionReason });

    switch (result.outcome) {
      case "not_found":
        return NextResponse.json({ error: "Approval not found" }, { status: 404 });
      case "already_processed":
        return NextResponse.json({ error: "Approval already processed" }, { status: 409 });
      case "failed":
        return NextResponse.json({ error: `Action failed: ${result.error}` }, { status: 502 });
      default: {
        const approval = await prisma.approvalAction.findUniqueOrThrow({ where: { id: approvalId } });
        return NextResponse.json({ approval, executed: result.outcome === "completed" }, { status: 200 });
      }
    }
  } catch (error) {
    await reportError(error, { where: "Approval decision error" });
    return NextResponse.json({ error: "Decision failed" }, { status: 500 });
  }
}
