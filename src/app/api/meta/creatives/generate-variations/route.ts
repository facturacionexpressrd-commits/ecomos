import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    const { creativeId } = await req.json();

    if (!creativeId) {
      return NextResponse.json(
        { error: "Creative ID required" },
        { status: 400 }
      );
    }

    const creative = await prisma.metaCreative.findUnique({
      where: { id: creativeId },
    });

    if (!creative) {
      return NextResponse.json({ error: "Creative not found" }, { status: 404 });
    }

    // In production, use image processing library (Sharp)
    // For now, create variation records with different formats
    const variations = [];

    for (const format of ["square", "vertical", "story"]) {
      const variation = await prisma.metaCreative.create({
        data: {
          campaignId: creative.campaignId,
          title: `${creative.title} - ${format}`,
          data: creative.data,
          format,
          status: "active",
        },
      });
      variations.push({
        id: variation.id,
        format,
        status: variation.status,
      });
    }

    return NextResponse.json({ variations });
  } catch (error) {
    console.error("Variation generation error:", error);
    return NextResponse.json(
      { error: "Variation generation failed" },
      { status: 500 }
    );
  }
}
