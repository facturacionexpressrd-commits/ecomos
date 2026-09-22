import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";
import { billingEnabled, stripe } from "@/lib/billing";
import { reportError } from "@/lib/alerts";

/** Stripe's hosted portal handles card changes, invoices and cancellation, so none of that is built here. */
export async function POST(req: NextRequest) {
  const go = (url: string) => NextResponse.redirect(new URL(url, req.url), 303);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return go("/login?next=/billing");
  if (!billingEnabled()) return go("/billing");

  try {
    await requireOrgCapability(user.id, CAPABILITIES.orgManageUsers);
  } catch (err) {
    if (err instanceof ForbiddenError) return go("/billing?error=forbidden");
    throw err;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { organization: true } });
  const customer = dbUser?.organization.stripeCustomerId;
  if (!customer) return go("/billing");

  try {
    const session = await stripe().billingPortal.sessions.create({
      customer,
      return_url: `${new URL(req.url).origin}/billing`,
    });
    return go(session.url);
  } catch (error) {
    await reportError(error, { where: "POST /api/billing/portal" });
    return go("/billing?error=failed");
  }
}
