import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";
import { ACTIVE_META } from "@/lib/meta/status";
import { getLocale } from "@/lib/i18n/server";
import OperatorCommandCenter from "@/components/dashboard/OperatorCommandCenter";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string }>;
}) {
  const { store: requestedStoreId } = await searchParams;
  const locale = await getLocale();

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
          {t("overview.empty.title")}
        </p>
        <p className="text-sm text-lo">{t("overview.empty.body")}</p>
        <div className="glass p-5 text-left">
          <ConnectStoreForm />
        </div>
        <p className="text-xs text-faint">{t("overview.empty.invitation")}</p>
      </div>
    );
  }

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">
        {t("common.noAccessStore")}
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
    variantsMissingCost,
    metaAccount,
    recentProducts,
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
      prisma.productVariant.count({ where: { storeId, cost: null } }),
      prisma.metaAccount.findFirst({ where: { storeId, ...ACTIVE_META }, select: { id: true } }),
      prisma.product.findMany({
        where: { storeId },
        orderBy: { updatedAt: "desc" },
        take: 6,
        include: { variants: { select: { price: true } } },
      }),
    ]);


  const currency = latestOrder?.currency ?? "USD";
  const revenue14d = dailyMetrics.reduce((s, d) => s + d.grossRevenue.toNumber(), 0);
  const profit14d = dailyMetrics.reduce((s, d) => s + d.contributionProfit.toNumber(), 0);
  const margin = revenue14d > 0 ? (profit14d / revenue14d) * 100 : 0;

  return (
    <OperatorCommandCenter
      locale={locale}
      storeId={storeId}
      storeName={store.name}
      currency={currency}
      revenue14d={revenue14d}
      profit14d={profit14d}
      margin={margin}
      orders={orderCount}
      inventory={inventoryTotal._sum.available ?? 0}
      activeCampaigns={campaignCount}
      openExceptions={exceptionCount}
      productCount={productCount}
      variantsMissingCost={variantsMissingCost}
      metaConnected={!!metaAccount}
      revenueTrend={dailyMetrics.map((day) => day.grossRevenue.toNumber())}
      products={recentProducts.map((product) => ({
        id: product.id,
        title: product.title,
        status: product.status,
        raw: product.raw,
        variantPrices: product.variants.map((variant) => variant.price?.toNumber() ?? 0),
      }))}
    />
  );
