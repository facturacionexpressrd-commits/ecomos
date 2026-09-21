import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MetaClient } from "@/lib/meta/client";
import { connectAdAccount, listAdAccountChoices, sealPending } from "@/lib/meta/connect";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

/**
 * GET /api/meta/auth/callback
 *
 * Meta OAuth callback endpoint.
 * Exchanges authorization code for access token.
 * Stores token and business info in MetaAccount.
 *
 * Query params (from Meta):
 * - code: authorization code
 * - state: CSRF token, must match the meta_auth_state cookie
 * - error: error code if denied
 */

const AUTH_COOKIES = ["meta_auth_store_id", "meta_auth_state"];

// NextResponse.redirect rejects relative URLs, so every redirect resolves
// against the incoming request origin.
function redirectTo(req: NextRequest, path: string): NextResponse {
  const res = NextResponse.redirect(new URL(path, req.url));
  for (const name of AUTH_COOKIES) res.cookies.delete(name);
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      return redirectTo(req, `/dashboard?meta_auth_error=${encodeURIComponent(error)}`);
    }

    if (!code) {
      return redirectTo(req, `/dashboard?meta_auth_error=missing_code`);
    }

    // Verify CSRF state before anything else touches the code
    const expectedState = req.cookies.get("meta_auth_state")?.value;
    if (!expectedState || !state || state !== expectedState) {
      return redirectTo(req, `/dashboard?meta_auth_error=state_mismatch`);
    }

    // Get storeId from cookie
    const storeId = req.cookies.get("meta_auth_store_id")?.value;
    if (!storeId) {
      return redirectTo(req, `/dashboard?meta_auth_error=missing_store`);
    }

    // Verify user auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return redirectTo(req, `/login?next=/dashboard`);
    }

    // Verify store access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
      return redirectTo(req, `/dashboard?meta_auth_error=no_store_access`);
    }

    // Exchange code for token
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const tokenResponse = await metaClient.getAccessToken(code);
    const accessToken = tokenResponse.access_token;

    const choices = await listAdAccountChoices(metaClient, accessToken);
    if (choices.length === 0) {
      return redirectTo(req, `/dashboard?meta_auth_error=no_ad_accounts`);
    }

    // Never guess which of several accounts should be able to spend: hand the choice to the user.
    if (choices.length > 1) {
      const key = process.env.TOKEN_ENCRYPTION_KEY;
      if (!key) throw new Error("TOKEN_ENCRYPTION_KEY not set");
      const res = redirectTo(req, `/dashboard/integrations/meta-account`);
      res.cookies.set("meta_pick", sealPending({ token: accessToken, storeId }, key), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
      return res;
    }

    const metaAccount = await connectAdAccount({
      storeId,
      userId: user.id,
      accessToken,
      businessId: choices[0].businessId,
      adAccountId: choices[0].adAccountId,
    });

    // Redirect to success page
    return redirectTo(
      req,
      `/dashboard?meta_auth_success=true&meta_account_id=${metaAccount.id}`
    );
  } catch (error) {
    console.error("Error in Meta auth callback:", error);
    return redirectTo(req, `/dashboard?meta_auth_error=callback_failed`);
  }
}
