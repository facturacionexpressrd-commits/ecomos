import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import HeroBanner from "@/components/dashboard/HeroBanner";
import Backdrop from "@/components/Backdrop";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "EcomOS: real profit for Shopify stores",
  description:
    "Orders, refunds, product costs and Meta ad spend in one dashboard, so you see true profit per product and per variant.",
};

const primary =
  "inline-flex items-center gap-2 rounded-lg bg-gradient-to-b from-gold-hi to-gold px-5 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90";
const secondary =
  "rounded-lg border border-line-hi px-5 py-3 text-sm text-hi hover:bg-white/5";

const STEPS = [
  [
    "Connect Shopify",
    "Products, orders and inventory import automatically and stay in sync.",
  ],
  ["Add your costs", "Type them in, or link CJ and they fill themselves."],
  [
    "Connect Meta Ads",
    "Spend lands next to revenue, and profit accounts for it.",
  ],
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <>
      <Backdrop />
      <main className="relative z-10 mx-auto w-full max-w-6xl px-3 pt-3 pb-16">
        <div className="relative">
          <HeroBanner />
          <header className="relative flex items-center justify-between px-4 pt-4 sm:px-8">
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-coral text-sm font-bold text-ink">
                E
              </span>
              <span className="font-[family-name:var(--font-display)] text-2xl text-hi italic">
                EcomOS
              </span>
            </span>
            <Link href="/login" className="text-sm text-hi hover:opacity-80">
              Sign in
            </Link>
          </header>

          <section className="relative px-4 pt-24 pb-16 sm:px-8 lg:pt-36">
            <h1 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl leading-tight font-medium text-hi italic sm:text-6xl">
              Know what every product really makes you.
            </h1>
            <p className="mt-5 max-w-xl text-base text-hi/90 sm:text-lg">
              EcomOS pulls your Shopify orders, refunds, product costs and Meta
              ad spend into one dashboard, so you see true profit per product
              and per variant.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/login?mode=sign-up" className={primary}>
                Create your account <ArrowRight size={16} />
              </Link>
              <a href="#how" className={secondary}>
                How it works
              </a>
            </div>
          </section>
        </div>


        <section id="how" className="mt-16 px-1">
          <p className="mb-6 text-xs font-medium tracking-[0.14em] text-faint uppercase">
            Set up in three steps
          </p>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {STEPS.map(([title, body], i) => (
              <li key={title} className="glass p-6">
                <span className="mb-3 block font-mono text-sm text-gold-hi">
                  0{i + 1}
                </span>
                <p className="mb-2 font-medium text-hi">{title}</p>
                <p className="text-sm text-lo">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="glass mt-16 flex flex-col items-start gap-5 p-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-[family-name:var(--font-display)] text-2xl text-hi italic">
              Stop guessing your margins.
            </p>
            <p className="mt-1 text-sm text-lo">
              Connect your first store in a couple of minutes.
            </p>
          </div>
          <Link href="/login?mode=sign-up" className={primary}>
            Get started <ArrowRight size={16} />
          </Link>
        </section>

        <footer className="mt-12 flex flex-wrap gap-5 px-1 text-xs text-faint">
          <span>© {new Date().getFullYear()} EcomOS</span>
          <Link href="/privacy" className="hover:text-lo">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-lo">
            Terms
          </Link>
          <Link href="/data-deletion" className="hover:text-lo">
            Data deletion
          </Link>
        </footer>
      </main>
    </>
  );
}
