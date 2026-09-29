import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";

export const dynamic = "force-dynamic";

// Booleans only. Never leaks values. Owner-gated. Answers "which env vars are set on this deploy"
// so we can debug prod connect failures without pulling Vercel logs.
const CHECKS = [
  "DATABASE_URL",
  "TOKEN_ENCRYPTION_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_APP_URL",
  "SHOPIFY_API_KEY",
  "SHOPIFY_API_SECRET",
  "SHOPIFY_WEBHOOK_SECRET",
  "SHOPIFY_APP_URL",
  "META_APP_ID",
  "META_APP_SECRET",
  "CJ_API_URL",
  "CJ_EMAIL",
  "CJ_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await requireOrgCapability(user.id, CAPABILITIES.orgManageUsers);
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  const set = Object.fromEntries(CHECKS.map((k) => [k, Boolean(process.env[k])]));
  return NextResponse.json({
    ok: true,
    env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    set,
  });
}
