import { NextRequest, NextResponse } from "next/server";
import { runDaily } from "@/lib/jobs/daily";

export const maxDuration = 300;

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A 500 marks the run as failed in Vercel's cron log instead of reporting success.
  const result = await runDaily();
  return NextResponse.json({ ok: !result.failed, ...result }, { status: result.failed ? 500 : 200 });
}
