import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { aiQuotaExceeded } from "@/lib/limits";
import { ClaudeCreativeProvider } from "@/lib/ai/providers/claude-creative";
import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/alerts";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, productId, targetAudience } = await req.json();

  // Verify user has access
  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.aiGenerate)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const limited = await aiQuotaExceeded("ideas", storeId);
  if (limited) {
    return NextResponse.json(
      { error: "AI generation limit reached. Try again later." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  try {
    const product = await prisma.product.findFirst({
      where: { storeId, id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 500 }
      );
    }

    const provider = new ClaudeCreativeProvider(apiKey);
    const concepts = await provider.generateConcepts({
      productTitle: product.title,
      productDescription: (product.raw as { description?: string })?.description,
      targetAudience,
    });

    // Save creative ideas and assets
    const savedIdeas = await Promise.all(
      concepts.map((concept) =>
        prisma.creativeIdea.create({
          data: {
            storeId,
            productId,
            headlineText: concept.headline.text,
            headlineHook: concept.headline.hook,
            headlineCta: concept.headline.cta,
            imageConceptText: concept.concepts.image,
            videoConceptText: concept.concepts.video,
            targetAudience: concept.targetAudience,
            emotionalApeals: concept.emotionalApeals,
            aiProvider: "claude",
          },
          include: {
            creatives: true,
          },
        })
      )
    );

    return NextResponse.json({ ideas: savedIdeas }, { status: 200 });
  } catch (error) {
    await reportError(error, { where: "Creative generation error" });
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
