import { NextRequest, NextResponse } from "next/server";
import { MetaClient } from "@/lib/meta/client";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";

/**
 * GET /api/meta/auth/start
 *
 * Initiates Meta OAuth flow.
 * Redirects user to Meta authorization page.
 *
 * Query params:
 * - storeId: which store to connect Meta to
 */
export async function GET(req: NextRequest) {
  // Called by full-page navigation (see ConnectMetaButton), so every failure has to be a redirect
  // to /dashboard with a meta_auth_error param — raw JSON in the browser is a dead end for users.
  const back = (err: string) =>
    NextResponse.redirect(new URL(`/dashboard?meta_auth_error=${encodeURIComponent(err)}`, req.url));

  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) return back("missing_store");

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return NextResponse.redirect(new URL(`/login?next=/dashboard`, req.url));

    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.campaignsManage)) {
      return back("no_store_access");
    }

    // Env-var guard: without META_APP_ID the auth URL builds with an empty client_id and Meta
    // just shows "invalid client". Fail fast and tell the user something diagnosable.
    if (!process.env.META_APP_ID || !process.env.META_APP_SECRET) {
      return back("not_configured");
    }

    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID,
      appSecret: process.env.META_APP_SECRET,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const state = MetaClient.generateState();
    const authUrl = metaClient.getAuthorizationUrl(state);

    // Store storeId + state in session cookies for the callback to retrieve.
    // The state cookie is what makes the callback's CSRF check possible.
    const response = NextResponse.redirect(authUrl);
    const cookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 600, // 10 minutes
    };
    response.cookies.set("meta_auth_store_id", storeId, cookieOpts);
    response.cookies.set("meta_auth_state", state, cookieOpts);

    return response;
  } catch (error) {
    await reportError(error, { where: "Error starting Meta auth" });
    return NextResponse.redirect(
      new URL(`/dashboard?meta_auth_error=start_failed`, req.url),
    );
  }
}
