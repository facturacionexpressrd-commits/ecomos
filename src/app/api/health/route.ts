import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { reportError } from "@/lib/alerts";

export const dynamic = "force-dynamic";

// Point an uptime monitor at this: it only answers 200 when the database is reachable.
export async function GET() {
  try {
    await prisma.$queryRaw`select 1`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    await reportError(error, { where: "GET /api/health" });
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
