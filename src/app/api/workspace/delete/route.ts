import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";
import { deleteWorkspace } from "@/lib/onboarding";
import { reportError } from "@/lib/alerts";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireOrgCapability(user.id, CAPABILITIES.orgManageUsers);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const { confirmName } = (await request.json()) as { confirmName?: string };
  if (!confirmName) return NextResponse.json({ error: "confirmName is required" }, { status: 400 });

  try {
    const result = await deleteWorkspace({ userId: user.id, confirmName });
    if (!result.ok) {
      const message = result.reason === "name_mismatch" ? "Workspace name did not match" : "Workspace not found";
      return NextResponse.json({ error: message }, { status: result.reason === "name_mismatch" ? 400 : 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    await reportError(error, { where: "POST /api/workspace/delete" });
    return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
  }
}
