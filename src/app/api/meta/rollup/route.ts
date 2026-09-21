import { NextRequest, NextResponse } from "next/server";
import { rollupAllMetaStores } from "@/lib/meta/rollup";

/**
 * POST /api/meta/rollup
 *
 * Aggregate daily Meta spend into DailyFinancialMetric for ROAS trending. The nightly cron
 * (/api/cron/daily) already does this; this endpoint is for manual runs.
 *
 * Security: Requires the META_SYNC_API_KEY bearer token.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || authHeader !== `Bearer ${process.env.META_SYNC_API_KEY}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { results, ...summary } = await rollupAllMetaStores();
    return NextResponse.json({ ok: true, message: "Spend rollup completed", summary, results });
  } catch (error) {
    console.error("[Spend Rollup API] Error:", error);
    return NextResponse.json(
      { error: "Rollup failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
