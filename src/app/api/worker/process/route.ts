import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.WORKER_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { jobId, type, data } = await req.json();

    switch (type) {
      case "campaign_analysis":
        await analyzeCampaignPerformance(data.campaignId);
        break;
      case "report_generation":
        await generateReport(data.storeId, data.days);
        break;
      case "sync_meta":
        await syncMetaCampaigns(data.storeId);
        break;
      default:
        return NextResponse.json({ error: "Unknown job type" }, { status: 400 });
    }

    return NextResponse.json({ jobId, status: "completed", timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Worker error:", error);
    return NextResponse.json({ error: "Job failed", message: String(error) }, { status: 500 });
  }
}

async function analyzeCampaignPerformance(campaignId: string) {
  const campaign = await prisma.metaCampaign.findUnique({
    where: { id: campaignId },
    include: { adSets: { include: { spendDaily: true } } },
  });

  if (!campaign) return;

  let totalSpend = 0, totalClicks = 0;
  campaign.adSets.forEach((adSet) => {
    adSet.spendDaily.forEach((s) => {
      totalSpend += s.spendCents / 100;
      totalClicks += s.clicks || 0;
    });
  });

  const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
  await prisma.metaCampaign.update({
    where: { id: campaignId },
    data: { cpc, lastAnalyzed: new Date() },
  });
}

async function generateReport(storeId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const orders = await prisma.order.findMany({
    where: { storeId, createdAt: { gte: startDate } },
    include: { lineItems: { include: { variant: true } } },
  });

  console.log("Report generated:", { storeId, period: `${days} days`, orders: orders.length });
}

async function syncMetaCampaigns(storeId: string) {
  const campaigns = await prisma.metaCampaign.findMany({ where: { storeId } });
  console.log(`Syncing ${campaigns.length} campaigns for store ${storeId}`);
}
