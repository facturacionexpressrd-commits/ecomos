import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { OpportunityScorer } from "@/lib/research/scoring";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, minMargin, maxCost, maxShipping, competitionLevel } =
    await req.json();

  // Verify user has access
  const access = await prisma.userStoreAccess.findFirst({
    where: { userId: user.id, storeId },
  });

  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    // Search watchlist for matching opportunities
    const watchlistItems = await prisma.researchWatchlist.findMany({
      where: {
        storeId,
        status: { not: "archived" },
        cost: maxCost ? { lte: maxCost } : undefined,
        margin: minMargin ? { gte: minMargin } : undefined,
        shippingCost: maxShipping ? { lte: maxShipping } : undefined,
        competitionLevel: competitionLevel,
      },
      orderBy: { opportunityScore: "desc" },
      take: 50,
    });

    const scorer = new OpportunityScorer();

    // Re-score items (in case scoring algorithm changes)
    const scoredItems = watchlistItems.map((item) =>
      scorer.scoreOpportunity(
        item.id,
        item.productTitle,
        item.cost.toNumber(),
        item.estimatedRetailPrice.toNumber(),
        item.shippingCost?.toNumber() || 0,
        item.competitionLevel as "low" | "medium" | "high",
        item.demandSignals
      )
    );

    return NextResponse.json(
      {
        results: scoredItems,
        count: scoredItems.length,
        criteria: {
          minMargin,
          maxCost,
          maxShipping,
          competitionLevel,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Research search error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Search failed" },
      { status: 500 }
    );
  }
}
