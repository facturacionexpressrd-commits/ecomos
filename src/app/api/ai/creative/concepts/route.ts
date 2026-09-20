import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { ClaudeCreativeProvider } from "@/lib/ai/providers/claude-creative";
import { NextRequest, NextResponse } from "next/server";

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
  const access = await prisma.userStoreAccess.findFirst({
    where: { userId: user.id, storeId },
  });

  if (!access) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
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
      productDescription: (product.raw as Record<string, unknown>)?.description as string | undefined,
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
    console.error("Creative generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
