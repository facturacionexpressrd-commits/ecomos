import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { aiQuotaExceeded } from "@/lib/limits";
import { ClaudeAIProvider } from "@/lib/ai/providers/claude";
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

  const { storeId, productId, targetAudience, toneOfVoice } = await req.json();

  // Verify user has access
  const grants = await loadStoreAccessGrants(user.id);
  if (!hasCapability(grants, storeId, CAPABILITIES.aiGenerate)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const limited = await aiQuotaExceeded("copy", storeId);
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

    const aiProvider = new ClaudeAIProvider(apiKey);
    const generated = await aiProvider.generateProductCopy({
      productTitle: product.title,
      productDescription: (product.raw as { description?: string })?.description,
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
    await reportError(error, { where: "AI generation error" });
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}
