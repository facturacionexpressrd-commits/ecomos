import { NextRequest, NextResponse } from "next/server";
import { requireActiveBusiness } from "@/lib/auth/session";
import { sendTestEmail } from "@/lib/alerts/send";

export async function POST(req: NextRequest) {
  try {
    const session = await requireActiveBusiness();
    await sendTestEmail(session.user.email);
    return NextResponse.json({ success: true, message: "Test email sent" });
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: "Failed to send test email" }, { status: 500 });
  }
}
