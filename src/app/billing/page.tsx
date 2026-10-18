import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasOrgCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { billingEnabled, hasAccess, stripe, syncSubscription } from "@/lib/billing";
import { StatusPill } from "@/components/dashboard/ui/PageHeader";
import type { MessageKey } from "@/lib/i18n";
import { getLocale, getT } from "@/lib/i18n/server";
import { ArrowRight, ArrowLeft } from "lucide-react";

const ERRORS: Record<string, MessageKey> = {
  forbidden: "billing.error.forbidden",
  failed: "billing.error.failed",
};

const primaryBtn =
  "inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { checkout, error } = await searchParams;
  const t = await getT();
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/billing");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, include: { organization: true } });
  if (!dbUser) redirect("/onboarding");
  let org = dbUser.organization;

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
    <main className="mx-auto max-w-2xl px-6 py-16 sm:px-10 sm:py-24">
      <Link href="/" className="mb-10 inline-flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-semibold text-white">
          E
        </span>
        <span className="text-base font-medium tracking-tight text-neutral-900">EcomOS</span>
      </Link>

      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {org.name}
      </p>
      <h1 className="text-4xl font-medium tracking-[-0.02em] text-neutral-900 sm:text-5xl">
        {t("billing.title")}
      </h1>
      <p className="mt-3 max-w-xl text-sm text-neutral-600">{t("billing.subtitle")}</p>

      {error && ERRORS[error] && (
        <p className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t(ERRORS[error])}
        </p>
      )}
      {checkout === "success" && active && (
        <p className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {t("billing.paymentReceived")}
        </p>
      )}

      <section className="mt-10 rounded-2xl border border-neutral-200 bg-white p-6 sm:p-8">
        {!billingEnabled() ? (
          <p className="text-sm text-neutral-600">{t("billing.notEnabled")}</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <p className="text-sm text-neutral-600">{t("billing.status")}</p>
              {org.subscriptionStatus === "comped" ? (
                <StatusPill status={t("billing.freeWorkspace")} />
              ) : (
                <StatusPill status={org.subscriptionStatus ?? t("billing.notSubscribed")} />
              )}
            </div>
            {org.currentPeriodEnd && org.subscriptionStatus !== "comped" && (
              <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
                <p className="text-sm text-neutral-600">
                  {org.subscriptionStatus === "canceled" ? t("billing.ended") : t("billing.renews")}
                </p>
                <p className="font-mono text-sm text-neutral-900">
                  {org.currentPeriodEnd.toLocaleDateString(locale)}
                </p>
              </div>
            )}

            {!canManage ? (
              <p className="text-sm text-neutral-600">{t("billing.askOwner")}</p>
            ) : org.subscriptionStatus === "comped" ? null : active ? (
              <form method="POST" action="/api/billing/portal">
                <button className={primaryBtn}>
                  {t("billing.manage")} <ArrowRight size={14} />
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-neutral-600">{t("billing.subscribePrompt")}</p>
                <form method="POST" action="/api/billing/checkout">
                  <button className={primaryBtn}>
                    {t("billing.subscribe")} <ArrowRight size={14} />
                  </button>
                </form>
                {org.stripeCustomerId && (
                  <form method="POST" action="/api/billing/portal">
                    <button className="text-sm text-neutral-600 underline underline-offset-4 hover:text-neutral-900">
                      {t("billing.pastInvoices")}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {(active || !billingEnabled()) && (
        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft size={13} /> {t("billing.backToDashboard")}
        </Link>
      )}
    </main>
  );
}
