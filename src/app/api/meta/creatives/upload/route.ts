import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const campaignId = formData.get("campaignId") as string;

    if (!file || !campaignId) {
      return NextResponse.json(
        { error: "File and campaign ID required" },
        { status: 400 }
      );
    }

    // Verify campaign belongs to store
    const campaign = await prisma.metaCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign || campaign.storeId !== session.activeStore.id) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // In production, upload to Meta or cloud storage
    // For now, store metadata
    const creative = await prisma.metaCreative.create({
      data: {
        campaignId,
        title: file.name,
        data: base64,
        format: "original",
        status: "active",
      },
    });

    return NextResponse.json({
      id: creative.id,
      name: file.name,
      size: file.size,
      uploadedAt: creative.createdAt,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    const campaignId = req.nextUrl.searchParams.get("campaignId");

    if (!campaignId) {
      return NextResponse.json(
        { error: "Campaign ID required" },
        { status: 400 }
      );
    }

    const creatives = await prisma.metaCreative.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      creatives: creatives.map((c) => ({
        id: c.id,
        name: c.title,
        format: c.format,
        status: c.status,
        uploadedAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
