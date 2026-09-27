import { after, NextRequest, NextResponse } from "next/server";
import { drainAndContinue } from "@/lib/jobs/drain";
import { reportError } from "@/lib/alerts";

export const maxDuration = 300;

/**
 * Continues draining the job queue in a fresh function. Called by drainAndContinue when a previous
 * run left work behind. Answers 202 right away and drains in after(), so the caller isn't held open
 * and a dropped caller connection can't cancel the drain.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  after(() => drainAndContinue().catch((err) => reportError(err, { where: "[drain chain]" })));
  return NextResponse.json({ ok: true }, { status: 202 });
}
