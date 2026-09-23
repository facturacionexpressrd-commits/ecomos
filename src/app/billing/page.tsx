import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasOrgCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { billingEnabled, hasAccess, stripe, syncSubscription } from "@/lib/billing";
import { PageHeader, StatusPill } from "@/components/dashboard/ui/PageHeader";
import HeroBanner from "@/components/dashboard/HeroBanner";

const ERRORS: Record<string, string> = {
  forbidden: "Only a workspace owner can change billing.",
  failed: "We couldn't reach the payment provider. Please try again.",
};

const button =
  "rounded-lg bg-gradient-to-b from-gold-hi to-gold px-4 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { checkout, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/billing");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { organization: true } });
  if (!dbUser) redirect("/onboarding");
  let org = dbUser.organization;

  // Back from Checkout before the webhook landed: pull the subscription now so the dashboard opens
  // straight away instead of bouncing back here. The webhook still does the same write later.
  if (checkout === "success" && billingEnabled() && org.stripeCustomerId && !hasAccess(org.subscriptionStatus)) {
    const subs = await stripe().subscriptions.list({ customer: org.stripeCustomerId, status: "all", limit: 1 });
    if (subs.data[0]) {
      await syncSubscription(subs.data[0]);
      org = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    }
  }

  const canManage = hasOrgCapability(await loadStoreAccessGrants(user.id), CAPABILITIES.orgManageUsers);
  const active = hasAccess(org.subscriptionStatus);

  return (
    <main className="relative z-10 mx-auto max-w-3xl px-3 pt-3 pb-16">
      <div className="relative">
      <HeroBanner />
      <div className="relative px-4 pt-28 sm:px-8">
      <PageHeader eyebrow={org.name} title="Billing" subtitle="Your EcomOS subscription." />

      {error && ERRORS[error] && <p className="glass mb-6 p-4 text-sm text-coral">{ERRORS[error]}</p>}
      {checkout === "success" && active && (
        <p className="glass mb-6 p-4 text-sm text-teal">Payment received. Your subscription is active.</p>
      )}

      <section className="glass rise-in p-6">
        {!billingEnabled() ? (
          <p className="text-sm text-lo">Billing isn&apos;t switched on yet. Everything is free for now.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-lo">Status</p>
              {org.subscriptionStatus === "comped" ? (
                <StatusPill status="free workspace" />
              ) : (
                <StatusPill status={org.subscriptionStatus ?? "not subscribed"} />
              )}
            </div>
            {org.currentPeriodEnd && org.subscriptionStatus !== "comped" && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-lo">{org.subscriptionStatus === "canceled" ? "Ended" : "Renews"}</p>
                <p className="text-sm text-hi">{org.currentPeriodEnd.toLocaleDateString()}</p>
              </div>
            )}

            {!canManage ? (
              <p className="text-sm text-lo">Ask a workspace owner to manage billing.</p>
            ) : org.subscriptionStatus === "comped" ? null : active ? (
              <form method="POST" action="/api/billing/portal">
                <button className={button}>Manage billing</button>
              </form>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-lo">Subscribe to use your dashboard, stores and campaigns.</p>
                <form method="POST" action="/api/billing/checkout">
                  <button className={button}>Subscribe</button>
                </form>
                {org.stripeCustomerId && (
                  <form method="POST" action="/api/billing/portal">
                    <button className="text-sm text-lo underline hover:text-hi">Past invoices</button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {(active || !billingEnabled()) && (
        <Link href="/dashboard" className="mt-6 inline-block text-sm text-lo hover:text-hi">
          ← Back to dashboard
        </Link>
      )}
      </div>
      </div>
    </main>
  );
}
