import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { ClaudeAIProvider } from "@/lib/ai/providers/claude";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storeId, productId, targetAudience, toneOfVoice } = await req.json();

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

    const aiProvider = new ClaudeAIProvider(apiKey);
    const generated = await aiProvider.generateProductCopy({
      productTitle: product.title,
      productDescription: (product.raw as any)?.description as string | undefined,
      targetAudience,
      toneOfVoice,
    });

    // Save suggestion
    const suggestion = await prisma.productAICopy.create({
      data: {
        storeId,
        productId,
        headline: generated.headline,
        description: generated.description,
        bulletPoints: generated.bulletPoints,
        seoKeywords: generated.seoKeywords,
        confidence: generated.confidence,
        aiProvider: "claude",
      },
    });

    return NextResponse.json({ suggestion }, { status: 200 });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
