import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanWorkspaceName, createWorkspace } from "@/lib/onboarding";
import { reportError } from "@/lib/alerts";

// The Supabase session cookie is SameSite=Lax, so a cross-site form post never carries it.
export async function POST(req: NextRequest) {
  const go = (path: string) => NextResponse.redirect(new URL(path, req.url), 303);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return go("/login");

  const name = cleanWorkspaceName((await req.formData()).get("name"));
  if (!name) return go("/onboarding?error=name");

  try {
    await createWorkspace({ userId: user.id, email: user.email, name });
  } catch (error) {
    await reportError(error, { where: "POST /api/onboarding" });
    return go("/onboarding?error=failed");
  }
  return go("/dashboard");
}
