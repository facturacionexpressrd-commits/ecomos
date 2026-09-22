import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader, EmptyState } from "@/components/dashboard/ui/PageHeader";
import { StatTile } from "@/components/dashboard/ui/StatTile";
import { Sparkline } from "@/components/dashboard/ui/Sparkline";
import { TrendingUp, PiggyBank, ReceiptText, Percent } from "lucide-react";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: requestedStoreId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }

  const since = new Date();
  since.setDate(since.getDate() - 30);

  const days = await prisma.dailyFinancialMetric.findMany({
    where: { storeId, date: { gte: since } },
    orderBy: { date: "asc" },
  });

  if (days.length === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <PageHeader eyebrow="Performance" title="Analytics" subtitle="Turn your data into an unfair advantage." />
        <EmptyState title="No financial data yet">
          Daily revenue, cost and profit figures appear here once orders sync and the nightly rollup runs.
        </EmptyState>
      </div>
    );
  }

  const revenue = days.reduce((s, d) => s + d.grossRevenue.toNumber(), 0);
  const cogs = days.reduce((s, d) => s + d.cogs.toNumber(), 0);
  const fees = days.reduce((s, d) => s + d.fees.toNumber(), 0);
  const profit = days.reduce((s, d) => s + d.contributionProfit.toNumber(), 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Performance" title="Analytics" subtitle="Turn your data into an unfair advantage." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Revenue (30d)" value={money(revenue)} icon={<TrendingUp size={16} />} />
        <StatTile label="Contribution profit" value={money(profit)} icon={<PiggyBank size={16} />} />
        <StatTile label="COGS + fees" value={money(cogs + fees)} icon={<ReceiptText size={16} />} />
        <StatTile label="Margin" value={`${margin.toFixed(1)}%`} icon={<Percent size={16} />} />
      </div>

      <div className="glass rise-in mb-6 p-6">
        <p className="mb-4 text-sm font-medium text-hi">Contribution profit, last 30 days</p>
        <Sparkline points={days.map((d) => d.contributionProfit.toNumber())} color="var(--gold)" />
      </div>

      <div className="glass overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs tracking-wide text-faint uppercase">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-5 py-3 text-right font-medium">Revenue</th>
              <th className="px-5 py-3 text-right font-medium">Refunds</th>
              <th className="px-5 py-3 text-right font-medium">COGS</th>
              <th className="px-5 py-3 text-right font-medium">Fees</th>
              <th className="px-5 py-3 text-right font-medium">Profit</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.id} className="border-b border-line last:border-0 hover:bg-white/3">
                <td className="px-5 py-3 text-lo">{d.date.toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right font-mono text-hi">{money(d.grossRevenue.toNumber())}</td>
                <td className="px-5 py-3 text-right font-mono text-coral">{money(d.refunds.toNumber())}</td>
                <td className="px-5 py-3 text-right font-mono text-lo">{money(d.cogs.toNumber())}</td>
                <td className="px-5 py-3 text-right font-mono text-lo">{money(d.fees.toNumber())}</td>
                <td className="px-5 py-3 text-right font-mono font-medium text-teal">
                  {money(d.contributionProfit.toNumber())}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
