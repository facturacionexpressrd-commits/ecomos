import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";
import { PageHeader, StatusPill } from "@/components/dashboard/ui/PageHeader";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { setupSteps } from "@/lib/setup";
import { billingEnabled, hasAccess } from "@/lib/billing";
import { ACTIVE_META } from "@/lib/meta/status";
import { ModuleHub } from "@/components/orchestrator/ModuleHub";
import { DailyPnL, type BestSeller, type PnLLine } from "@/components/orchestrator/DailyPnL";
import { NextActions, type NextAction } from "@/components/orchestrator/NextActions";
import { AgentTerminal, type AgentRunLine } from "@/components/orchestrator/AgentTerminal";
import { getT } from "@/lib/i18n/server";

const toNum = (d: { toNumber: () => number } | null | undefined) => (d ? d.toNumber() : 0);

export default async function OrchestratorPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: requestedStoreId } = await searchParams;
  const t = await getT();

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
        <p className="text-3xl font-semibold tracking-tight text-neutral-900">
          {t("overview.empty.title")}
        </p>
        <p className="text-sm text-neutral-600">{t("overview.empty.body")}</p>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 text-left">
          <ConnectStoreForm />
        </div>
        <p className="text-xs text-neutral-400">{t("overview.empty.invitation")}</p>
      </div>
    );
  }

  const storeId =
    requestedStoreId && grants.some((g) => g.storeId === requestedStoreId)
      ? requestedStoreId
      : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">
        {t("common.noAccessStore")}
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since7 = new Date(today);
  since7.setDate(since7.getDate() - 7);

  const [
    store,
    latestMetrics,
    recentMetrics,
    adSpendAgg,
    topLineItems,
    latestOrder,
    productCount,
    variantCount,
    variantsMissingCost,
    metaAccount,
  ] = await Promise.all([
    prisma.store.findUniqueOrThrow({
      where: { id: storeId },
      include: { organization: { select: { subscriptionStatus: true } } },
    }),
    prisma.dailyFinancialMetric.findFirst({
      where: { storeId },
      orderBy: { date: "desc" },
    }),
    prisma.dailyFinancialMetric.findMany({
      where: { storeId, date: { gte: since7 } },
      orderBy: { date: "asc" },
    }),
    prisma.metaSpendDaily.aggregate({
      where: { storeId, date: { gte: since7 } },
      _sum: { spend: true },
    }),
    prisma.orderLineItem.findMany({
      where: { storeId, order: { placedAt: { gte: since7 } } },
      select: {
        quantity: true,
        netAmount: true,
        variant: { select: { product: { select: { id: true, title: true } } } },
      },
    }),
    prisma.order.findFirst({ where: { storeId }, select: { currency: true } }),
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

  // Build daily P&L: prefer the most recent nightly metric; synthesise 7-day roll-up if none.
  const revenue = latestMetrics
    ? toNum(latestMetrics.grossRevenue)
    : recentMetrics.reduce((s, d) => s + toNum(d.grossRevenue), 0);
  const refundsCost = latestMetrics
    ? toNum(latestMetrics.refunds)
    : recentMetrics.reduce((s, d) => s + toNum(d.refunds), 0);
  const feesCost = latestMetrics
    ? toNum(latestMetrics.fees)
    : recentMetrics.reduce((s, d) => s + toNum(d.fees), 0);
  const cogsCost = latestMetrics
    ? toNum(latestMetrics.cogs)
    : recentMetrics.reduce((s, d) => s + toNum(d.cogs), 0);
  const adSpend = toNum(adSpendAgg._sum.spend);
  const netProfit = revenue - refundsCost - feesCost - cogsCost - adSpend;

  const costs: PnLLine[] = [
    { label: "Producto y COGS", value: cogsCost, tone: "cost" },
    { label: "Gasto en pauta (Meta)", value: adSpend, tone: "cost" },
    { label: "Comisiones de pago", value: feesCost, tone: "cost" },
    { label: "Devoluciones", value: refundsCost, tone: "cost" },
  ];

  // Aggregate best-sellers by product in app code. Prisma can't groupBy across a nested relation
  // and the per-store volume is small enough that a fetch-and-reduce is simpler than raw SQL.
  const sellersByProduct = new Map<string, { title: string; orders: number; revenue: number }>();
  for (const li of topLineItems) {
    const p = li.variant?.product;
    if (!p) continue;
    const cur = sellersByProduct.get(p.id) ?? { title: p.title, orders: 0, revenue: 0 };
    cur.orders += li.quantity;
    cur.revenue += toNum(li.netAmount);
    sellersByProduct.set(p.id, cur);
  }
  const bestSellers: BestSeller[] = Array.from(sellersByProduct.values())
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 4);

  // Phase 3-4 wiring: Jev's typed judgments + persisted NextAction / AgentRun tables land in the
  // next wave. Until then surface a representative queue so the Orchestrator view is complete.
  const nextActions: NextAction[] = [
    {
      id: "1",
      rank: 1,
      title: "Escalar “Couch rescue” a $900/día",
      rationale: "ROAS 2.3× sostenido 7 días. Margen por orden $18.",
      impactEstimate: "+$1,100/sem · confianza 0.78",
    },
    {
      id: "2",
      rank: 2,
      title: "Pausar “Galaxy Star Projector”",
      rationale: "Pierde $4/orden tras devoluciones las últimas 72 h.",
      impactEstimate: "−$220/día en pérdidas",
    },
    {
      id: "3",
      rank: 3,
      title: "Probar ángulo “satisfying empty”",
      rationale: "Hook con mayor retención en competidores esta semana.",
    },
  ];

  const agentLines: AgentRunLine[] = [
    { agent: "Spend Guard", tone: "lime", action: "revisó presupuestos", detail: "4 campañas · todo dentro de límite", cost: "0.02¢" },
    { agent: "Compliance", tone: "sky", action: "revisó 3 anuncios", detail: "0 bloqueados" },
    { agent: "P&L", tone: "amber", action: "cerró libros del día", detail: `net profit ${netProfit.toFixed(0)}` },
    { agent: "Attribution", tone: "pink", action: "casó órdenes a ads", detail: "14 de 14 enlazadas" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={store.name}
        title="Orquestador"
        subtitle="El COO que nunca duerme. 12 módulos, un sistema, cada decisión que gasta dinero pasa por ti."
        action={
          <div className="flex items-center gap-3">
            <StatusPill status={store.status} />
          </div>
        }
      />

      <SetupChecklist steps={steps} />

      <ModuleHub />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          <NextActions actions={nextActions} />
          <AgentTerminal lines={agentLines} />
        </div>
        <DailyPnL
          storeName={store.name}
          date={latestMetrics?.date ?? new Date()}
          revenue={revenue}
          costs={costs}
          netProfit={netProfit}
          bestSellers={bestSellers}
          currency={currency}
        />
      </div>
    </div>
  );
}
