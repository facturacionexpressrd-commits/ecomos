import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { requireOrgCapability, ForbiddenError, CAPABILITIES } from "@/lib/auth/capabilities";
import { billingEnabled, ensureCustomer, hasAccess, stripe } from "@/lib/billing";
import { reportError } from "@/lib/alerts";

// Form POST from /billing; the SameSite=Lax session cookie means a cross-site post can't start this.
export async function POST(req: NextRequest) {
  const go = (url: string) => NextResponse.redirect(new URL(url, req.url), 303);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return go("/login?next=/billing");
  if (!billingEnabled()) return go("/billing");

  try {
    await requireOrgCapability(user.id, CAPABILITIES.orgManageUsers);
  } catch (err) {
    if (err instanceof ForbiddenError) return go("/billing?error=forbidden");
    throw err;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { organization: true } });
  if (!dbUser) return go("/onboarding");
  const org = dbUser.organization;
  // Already paying: send them to manage the existing subscription instead of starting a second one.
  if (hasAccess(org.subscriptionStatus)) return go("/billing");

  try {
    const customer = await ensureCustomer(org, user.email);
    const origin = new URL(req.url).origin;
    const session = await stripe().checkout.sessions.create({
      mode: "subscription",
      customer,
      client_reference_id: org.id,
      line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
      subscription_data: { metadata: { organizationId: org.id } },
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing`,
    });
    return go(session.url!);
  } catch (error) {
    await reportError(error, { where: "POST /api/billing/checkout" });
    return go("/billing?error=failed");
  }
}
