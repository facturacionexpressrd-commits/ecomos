import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";
import { connectCj, disconnectCj, CjUserError } from "@/lib/suppliers/cj-service";
import { reportError } from "@/lib/alerts";

// Form POST from the Integrations page. The SameSite=Lax session cookie keeps cross-site posts out.
export async function POST(req: NextRequest) {
  const back = (params: Record<string, string>) =>
    NextResponse.redirect(new URL(`/dashboard/integrations?${new URLSearchParams(params)}`, req.url), 303);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url), 303);

  try {
    await requireOrgCapability(user.id, CAPABILITIES.orgManageUsers);
  } catch (err) {
    if (err instanceof ForbiddenError) return back({ cj_error: "Only a workspace owner can connect suppliers." });
    throw err;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { organizationId: true } });
  if (!dbUser) return NextResponse.redirect(new URL("/onboarding", req.url), 303);

  const form = await req.formData();
  try {
    if (form.get("action") === "disconnect") {
      await disconnectCj(dbUser.organizationId);
      return back({ cj: "disconnected" });
    }
    await connectCj(dbUser.organizationId, String(form.get("apiKey") ?? ""));
    await prisma.auditLog.create({
      data: { organizationId: dbUser.organizationId, userId: user.id, action: "supplier_connected", metadata: { supplier: "cj" } },
    });
    return back({ cj: "connected" });
  } catch (err) {
    if (err instanceof CjUserError) return back({ cj_error: err.message });
    await reportError(err, { where: "POST /api/suppliers/cj/connect" });
    return back({ cj_error: "Couldn't reach CJ. Please try again." });
  }
}
