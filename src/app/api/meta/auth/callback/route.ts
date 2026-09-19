import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { MetaClient, encryptToken } from "@/lib/meta/client";
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
 * - state: state token
 * - error: error code if denied
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // Handle user denial
    if (error) {
      return NextResponse.redirect(
        `/dashboard?meta_auth_error=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(`/dashboard?meta_auth_error=missing_code`);
    }

    // Get storeId from cookie
    const storeId = req.cookies.get("meta_auth_store_id")?.value;
    if (!storeId) {
      return NextResponse.redirect(`/dashboard?meta_auth_error=missing_store`);
    }

    // Verify user auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`/login?next=/dashboard`);
    }

    // Verify store access
    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
      return NextResponse.redirect(
        `/dashboard?meta_auth_error=no_store_access`
      );
    }

    // Exchange code for token
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const tokenResponse = await metaClient.getAccessToken(code);
    const accessToken = tokenResponse.access_token;

    // Fetch Meta business account info
    const businesses = await metaClient.getBusinessAccounts(accessToken);
    if (businesses.length === 0) {
      return NextResponse.redirect(
        `/dashboard?meta_auth_error=no_businesses`
      );
    }

    const business = businesses[0]; // Use first business for now (Phase 2)

    // Encrypt token for storage
    const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error("TOKEN_ENCRYPTION_KEY not set");
    }

    const encryptedToken = encryptToken(accessToken, encryptionKey);

    // Store in database
    const metaAccount = await prisma.metaAccount.create({
      data: {
        storeId,
        metaBusinessId: business.id,
        metaAccountId: business.id, // Will be updated after user selects ad account
        accessTokenEncrypted: encryptedToken,
        scope: "ads_read",
        status: "connected",
      },
    });

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        organizationId: user.id,
        userId: user.id,
        storeId,
        action: "meta_account_connected",
        metadata: {
          metaBusinessId: business.id,
          metaAccountId: metaAccount.id,
        },
      },
    });

    // Redirect to success page
    return NextResponse.redirect(
      `/dashboard?meta_auth_success=true&meta_account_id=${metaAccount.id}`
    );
  } catch (error) {
    console.error("Error in Meta auth callback:", error);
    return NextResponse.redirect(
      `/dashboard?meta_auth_error=callback_failed`
    );
  }
}
