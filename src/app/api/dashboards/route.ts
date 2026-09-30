import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    const dashboards = await prisma.customDashboard.findMany({
      where: { storeId: session.activeStore.id },
    });
    return NextResponse.json({ dashboards });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch dashboards" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    const { name, widgets } = await req.json();
    
    const dashboard = await prisma.customDashboard.create({
      data: {
        storeId: session.activeStore.id,
        name,
        widgets,
      },
    });

    return NextResponse.json({ dashboard });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create dashboard" }, { status: 500 });
  }
}