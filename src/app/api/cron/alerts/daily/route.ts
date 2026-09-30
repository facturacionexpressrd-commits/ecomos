import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkAlertsForStore, checkDailySummary } from "@/lib/alerts/trigger";
import { sendAlertEmail } from "@/lib/alerts/send";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data: stores } = await supabase
      .from("businesses")
      .select("id, user_id")
      .eq("status", "active");

    if (!stores || stores.length === 0) {
      return NextResponse.json({ processed: 0 });
    }

    let processed = 0;

    for (const store of stores) {
      const alerts = await checkAlertsForStore(store.id);
      const summary = await checkDailySummary(store.id);

      const { data: user } = await supabase
        .from("auth.users")
        .select("email")
        .eq("id", store.user_id)
        .single();

      if (user?.email && alerts.length > 0) {
        await sendAlertEmail(user.email, alerts, summary);
        processed += 1;
      }
    }

    return NextResponse.json({ processed, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Daily alerts cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed", message: String(error) },
      { status: 500 }
    );
  }
}
