import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rollupDailyMetaSpend } from "@/lib/meta/rollup";
import { Prisma } from "@prisma/client";

/**
 * POST /api/meta/rollup
 *
 * Aggregate daily Meta spend into DailyFinancialMetric for ROAS trending.
 * Designed to be called by pg_cron after campaign sync completes (e.g., daily at 2 AM).
 *
 * Security: Requires META_SYNC_API_KEY header (same as sync endpoint)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify sync API key
    const authHeader = req.headers.get("authorization");
    const expectedKey = `Bearer ${process.env.META_SYNC_API_KEY}`;

    if (!authHeader || authHeader !== expectedKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Spend Rollup API] Starting rollup for all stores");

    // Get all stores with connected Meta accounts
    const stores = await prisma.store.findMany({
      where: {
        metaAccounts: {
          some: {
            status: "connected",
          },
        },
      },
      select: { id: true, name: true },
    });

    const results: Record<string, any> = {};
    let totalSuccess = 0;
    let totalErrors = 0;

    // Rollup for each store
    for (const store of stores) {
      try {
        const rollupResult = await rollupDailyMetaSpend(store.id);
        results[store.name] = rollupResult;
        totalSuccess += rollupResult.datesProcessed;
        totalErrors += rollupResult.errors.length;

        console.log(`[Rollup] ${store.name}: ${rollupResult.datesProcessed} dates processed`);

        // Log to audit trail
        await prisma.auditLog.create({
          data: {
            organizationId: await getOrgForStore(store.id),
            storeId: store.id,
            action: "meta_spend_rollup_completed",
            metadata: rollupResult as unknown as Prisma.InputJsonObject,
          },
        });
      } catch (err) {
        console.error(`[Rollup] Error for store ${store.name}:`, err);
        results[store.name] = {
          error: err instanceof Error ? err.message : "Unknown error",
        };
        totalErrors++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Spend rollup completed",
      summary: {
        stores: stores.length,
        datesProcessed: totalSuccess,
        errors: totalErrors,
      },
      results,
    });
  } catch (error) {
    console.error("[Spend Rollup API] Error:", error);
    return NextResponse.json(
      { error: "Rollup failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

async function getOrgForStore(storeId: string): Promise<string> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { organizationId: true },
  });
  return store?.organizationId || "";
}
