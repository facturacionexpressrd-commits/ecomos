import { NextRequest, NextResponse } from "next/server";
import { MetaClient } from "@/lib/meta/client";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

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
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json({ error: "storeId required" }, { status: 400 });
    }

    // Verify user auth and store access
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const grants = await loadStoreAccessGrants(user.id);
    if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
      return NextResponse.json({ error: "No access to this store" }, { status: 403 });
    }

    // Create Meta client and get auth URL
    const metaClient = new MetaClient({
      appId: process.env.META_APP_ID || "",
      appSecret: process.env.META_APP_SECRET || "",
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/meta/auth/callback`,
    });

    const authUrl = metaClient.getAuthorizationUrl();

    // Store storeId in session cookie for callback to retrieve
    const response = NextResponse.redirect(authUrl);
    response.cookies.set("meta_auth_store_id", storeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Error starting Meta auth:", error);
    return NextResponse.json(
      { error: "Failed to start Meta authentication" },
      { status: 500 }
    );
  }
}
