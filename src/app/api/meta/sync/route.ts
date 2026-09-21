import { NextRequest, NextResponse } from "next/server";
import { syncAllMetaAccounts } from "@/lib/meta/sync";
import { reportError } from "@/lib/alerts";

/**
 * POST /api/meta/sync
 *
 * Triggers Meta campaign sync for all connected accounts.
 * Called by pg_cron every 4 hours or manually for testing.
 *
 * Security:
 * - Requires SYNC_API_KEY header (set in environment)
 * - This prevents unauthorized sync triggers
 */
export async function POST(req: NextRequest) {
  try {
    // Verify sync API key
    const authHeader = req.headers.get("authorization");
    const key = process.env.META_SYNC_API_KEY;

    if (!key || authHeader !== `Bearer ${key}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Meta Sync API] Starting sync");

    // Run sync
    await syncAllMetaAccounts();

    return NextResponse.json({ ok: true, message: "Meta sync completed" });
  } catch (error) {
    await reportError(error, { where: "[Meta Sync API] Error" });
    return NextResponse.json(
      { error: "Sync failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
