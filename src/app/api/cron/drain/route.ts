import { NextRequest, NextResponse } from "next/server";
import { drainQueues } from "@/lib/jobs/drain";

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await drainQueues()) });
  } catch (error) {
    console.error("Queue drain error:", error);
    return NextResponse.json({ error: "Drain failed" }, { status: 500 });
  }
}
