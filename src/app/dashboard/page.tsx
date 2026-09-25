import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";
import { StatTile } from "@/components/dashboard/ui/StatTile";
import { Sparkline } from "@/components/dashboard/ui/Sparkline";
import { PageHeader, StatusPill } from "@/components/dashboard/ui/PageHeader";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { setupSteps } from "@/lib/setup";
import { billingEnabled, hasAccess } from "@/lib/billing";
import { ACTIVE_META } from "@/lib/meta/status";
import { TrendingUp, Package, Wallet, Percent } from "lucide-react";

const money = (n: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);

export default async function DashboardPage({
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

  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
  if (!account) redirect("/onboarding");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) {
    return (
      <div className="mx-auto mt-6 flex max-w-md flex-col gap-5 text-center">
        <p className="font-[family-name:var(--font-display)] text-3xl font-medium italic text-hi">
          Build. Sell. Scale.
        </p>
        <p className="text-sm text-lo">
          Connect your Shopify store to bring products, orders and inventory into one command center.
        </p>
        <div className="glass p-5 text-left">
          <ConnectStoreForm />
        </div>
        <p className="text-xs text-faint">Waiting on an invitation instead? Open the link you were sent.</p>
      </div>
    );
  }

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">
        You don&apos;t have access to this store.
      </div>
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [
    store,
    orderCount,
    inventoryTotal,
    latestOrder,
    dailyMetrics,
    campaignCount,
    exceptionCount,
    productCount,
    variantCount,
    variantsMissingCost,
    metaAccount,
  ] = await Promise.all([
      prisma.store.findUniqueOrThrow({
        where: { id: storeId },
        include: { organization: { select: { subscriptionStatus: true } } },
      }),
      prisma.order.count({ where: { storeId } }),
      prisma.inventoryLevel.aggregate({ where: { storeId }, _sum: { available: true } }),
      prisma.order.findFirst({ where: { storeId }, select: { currency: true } }),
      prisma.dailyFinancialMetric.findMany({
        where: { storeId, date: { gte: since } },
        orderBy: { date: "asc" },
      }),
      prisma.metaCampaign.count({ where: { storeId, status: "ACTIVE" } }),
      prisma.fulfillmentException.count({ where: { supplierOrder: { storeId }, isResolved: false } }),
      prisma.product.count({ where: { storeId } }),
      prisma.productVariant.count({ where: { storeId } }),
      prisma.productVariant.count({ where: { storeId, cost: null } }),
      prisma.metaAccount.findFirst({ where: { storeId, ...ACTIVE_META }, select: { id: true } }),
    ]);

  const steps = setupSteps({
    storeId,
    productCount,
    variantCount,
    variantsMissingCost,
    metaConnected: !!metaAccount,
    billingEnabled: billingEnabled(),
    subscribed: hasAccess(store.organization.subscriptionStatus),
  });

  const currency = latestOrder?.currency ?? "USD";
  const revenue14d = dailyMetrics.reduce((s, d) => s + d.grossRevenue.toNumber(), 0);
  const profit14d = dailyMetrics.reduce((s, d) => s + d.contributionProfit.toNumber(), 0);
  const margin = revenue14d > 0 ? (profit14d / revenue14d) * 100 : 0;
  const trend = dailyMetrics.map((d) => d.grossRevenue.toNumber());

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={store.name}
        title="Overview"
        action={
          <div className="flex items-center gap-3">
            <StatusPill status={store.status} />
            {store.connectedAt && (
              <span className="text-xs text-faint">Connected {store.connectedAt.toLocaleDateString()}</span>
            )}
          </div>
        }
      />

      <SetupChecklist steps={steps} />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Revenue (14d)" value={money(revenue14d, currency)} icon={<TrendingUp size={16} />} />
        <StatTile label="Orders" value={orderCount.toLocaleString()} icon={<Package size={16} />} />
        <StatTile label="Contribution profit (14d)" value={money(profit14d, currency)} icon={<Wallet size={16} />} />
        <StatTile label="Margin" value={`${margin.toFixed(1)}%`} icon={<Percent size={16} />} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass rise-in p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-hi">Revenue, last 14 days</p>
            <span className="font-mono text-xs text-faint">{currency}</span>
          </div>
          <Sparkline points={trend} />
        </div>
        <div className="glass rise-in flex flex-col gap-4 p-6">
          <p className="text-sm font-medium text-hi">At a glance</p>
          <Row label="Inventory on hand" value={(inventoryTotal._sum.available ?? 0).toLocaleString()} />
          <Row label="Active campaigns" value={campaignCount.toLocaleString()} />
          <Row label="Open exceptions" value={exceptionCount.toLocaleString()} warn={exceptionCount > 0} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-line pt-3 first:border-t-0 first:pt-0">
      <span className="text-sm text-lo">{label}</span>
      <span className={`font-mono text-sm font-medium ${warn ? "text-coral" : "text-hi"}`}>{value}</span>
    </div>
  );
}
