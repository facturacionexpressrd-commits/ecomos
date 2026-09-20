import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncTrackingEvents } from "@/lib/orders/tracking-sync";

// This endpoint is designed to be called by a cron job
// For security, you should add authentication (e.g., check for a cron secret)
export async function POST(request: NextRequest) {
  try {
    // Optional: verify cron secret if using a background job service
    const cronSecret = request.headers.get("x-cron-secret");
    if (cronSecret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const synced = await syncTrackingEvents(prisma);

    return NextResponse.json({
      success: true,
      synced,
      message: `Synced tracking events for ${synced} shipments`,
    });
  } catch (error) {
    console.error("Tracking sync error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
