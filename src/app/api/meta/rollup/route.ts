import { NextRequest, NextResponse } from "next/server";
import { rollupAllMetaStores } from "@/lib/meta/rollup";
import { reportError } from "@/lib/alerts";

/**
 * POST /api/meta/rollup
 *
 * Aggregate daily Meta spend into DailyFinancialMetric for ROAS trending. The nightly cron
 * (/api/cron/daily) already does this; this endpoint is for manual runs.
 *
 * Security: Requires the META_SYNC_API_KEY bearer token.
 */
export async function POST(req: NextRequest) {
  const key = process.env.META_SYNC_API_KEY;
  if (!key || req.headers.get("authorization") !== `Bearer ${key}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { results, ...summary } = await rollupAllMetaStores();
    return NextResponse.json({ ok: true, message: "Spend rollup completed", summary, results });
  } catch (error) {
    await reportError(error, { where: "[Spend Rollup API] Error" });
    return NextResponse.json(
      { error: "Rollup failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
