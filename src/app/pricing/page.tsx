import Link from "next/link";
import type { Metadata } from "next";
import { Check, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { billingEnabled, stripe } from "@/lib/billing";
import Backdrop from "@/components/Backdrop";
import HeroBanner from "@/components/dashboard/HeroBanner";

export const metadata: Metadata = {
  title: "Pricing — EcomOS",
  description: "One plan. Every store, every integration, every teammate.",
};

const primary =
  "inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-gold-hi to-gold px-5 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90";
const secondary =
  "inline-flex items-center gap-2 rounded-lg border border-line-hi px-5 py-3 text-sm text-hi hover:bg-white/5";

// Live price pull. Falls back to defaults when Stripe isn't configured so the page still renders.
async function loadPrice(): Promise<{ display: string; interval: string }> {
  if (!billingEnabled() || !process.env.STRIPE_PRICE_ID) {
    return { display: "$49", interval: "month" };
  }
  try {
    const price = await stripe().prices.retrieve(process.env.STRIPE_PRICE_ID);
    const amount = (price.unit_amount ?? 0) / 100;
    const currency = (price.currency ?? "usd").toUpperCase();
    const symbol = currency === "USD" ? "$" : `${currency} `;
    return {
      display: `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      interval: price.recurring?.interval ?? "month",
    };
  } catch {
    return { display: "$49", interval: "month" };
  }
}

const INCLUDES = [
  "Unlimited Shopify stores",
  "Unlimited products, variants, orders",
  "Meta Ads: read, create, pause, activate, duplicate",
  "CJ Dropshipping: variant linking + order send",
  "Contribution profit per variant (revenue − refunds − fees − COGS)",
  "Nightly full re-sync + live webhooks",
  "Team invitations with role-based access",
  "Encrypted tokens (AES-256-GCM) and audit log",
  "GDPR compliance webhooks",
  "Cancel any time from the billing portal",
];

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { display, interval } = await loadPrice();
  const ctaHref = user ? "/billing" : "/login?mode=sign-up&next=/billing";
  const ctaLabel = user ? "Subscribe" : "Create account & subscribe";

  return (
    <>
      <Backdrop />
      <main className="relative z-10 mx-auto w-full max-w-5xl px-3 pt-3 pb-16">
        <div className="relative">
          <HeroBanner />
          <header className="relative flex items-center justify-between px-4 pt-4 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-coral text-sm font-bold text-ink">
                E
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl text-hi italic">
                EcomOS
              </span>
            </Link>
            <Link href={user ? "/dashboard" : "/login"} className="text-sm text-hi hover:opacity-80">
              {user ? "Dashboard" : "Sign in"}
            </Link>
          </header>

          <section className="relative px-4 pt-24 pb-8 sm:px-8 lg:pt-32">
            <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">Pricing</p>
            <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight font-medium text-hi italic sm:text-5xl">
              One plan. Everything included.
            </h1>
            <p className="mt-4 max-w-xl text-base text-hi/90">
              No seat tiers, no per-store fees, no integration paywalls. Cancel any time.
            </p>
          </section>
        </div>

        <section className="grid grid-cols-1 gap-4 px-1 lg:grid-cols-[1.2fr_1fr]">
          <div className="glass rise-in p-8">
            <p className="text-xs font-medium tracking-[0.14em] text-gold-hi uppercase">EcomOS</p>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl text-hi italic">{display}</span>
              <span className="text-sm text-lo">/ {interval}</span>
            </div>
            <p className="mt-3 text-sm text-lo">Billed monthly. No annual lock-in.</p>

            <div className="mt-8 flex flex-wrap gap-3">
              <form method="POST" action="/api/billing/checkout">
                {user ? (
                  <button className={primary} type="submit">
                    {ctaLabel} <ArrowRight size={16} />
                  </button>
                ) : (
                  <Link href={ctaHref} className={primary}>
                    {ctaLabel} <ArrowRight size={16} />
                  </Link>
                )}
              </form>
              <Link href="/" className={secondary}>
                Back to overview
              </Link>
            </div>

            <ul className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {INCLUDES.map((line) => (
                <li key={line} className="flex items-start gap-2 text-sm text-lo">
                  <Check size={16} className="mt-0.5 shrink-0 text-gold-hi" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          <aside className="glass rise-in p-8">
            <p className="text-xs font-medium tracking-[0.14em] text-faint uppercase">Need something bigger?</p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-hi italic">Enterprise</h2>
            <p className="mt-2 text-sm text-lo">
              Higher API limits, SSO, custom SLAs, invoicing, dedicated support — talk to us.
            </p>
            <a href="mailto:rreyes325@gmail.com?subject=EcomOS%20Enterprise" className={`${secondary} mt-5`}>
              Contact sales
            </a>
            <div className="mt-8 border-t border-line pt-6 text-xs text-lo">
              <p className="font-medium text-hi">Questions?</p>
              <p className="mt-1">
                See the <Link href="/" className="text-gold-hi hover:underline">product overview</Link>,
                the <Link href="/terms" className="text-gold-hi hover:underline">terms</Link>, or
                the <Link href="/privacy" className="text-gold-hi hover:underline">privacy policy</Link>.
              </p>
            </div>
          </aside>
        </section>

        <footer className="mt-12 flex flex-wrap gap-5 px-1 text-xs text-faint">
          <span>© {new Date().getFullYear()} EcomOS</span>
          <Link href="/privacy" className="hover:text-lo">Privacy</Link>
          <Link href="/terms" className="hover:text-lo">Terms</Link>
          <Link href="/data-deletion" className="hover:text-lo">Data deletion</Link>
        </footer>
      </main>
    </>
  );
}

// ponytail: single-tier only. Add multi-tier + comparison table when a second STRIPE_PRICE_ID lands.
