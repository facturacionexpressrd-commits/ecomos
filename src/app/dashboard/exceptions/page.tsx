import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ExceptionList from "@/components/orders/ExceptionList";
import { PageHeader, EmptyState } from "@/components/dashboard/ui/PageHeader";
import { StatTile } from "@/components/dashboard/ui/StatTile";
import { ListChecks, TriangleAlert, Flame, Clock } from "lucide-react";
import { getT } from "@/lib/i18n/server";

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; status?: string; severity?: string }>;
}) {
  const { store: requestedStoreId } = await searchParams;
  const t = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return (
      <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">{t("common.noAccessStore")}</div>
    );
  }

  const exceptions = await prisma.fulfillmentException.findMany({
    where: { supplierOrder: { storeId } },
    orderBy: [{ createdAt: "desc" }],
    include: { supplierOrder: { include: { order: true } } },
  });

  const stats = {
    total: exceptions.length,
    critical: exceptions.filter((e) => e.severity === "critical").length,
    high: exceptions.filter((e) => e.severity === "high").length,
    unresolved: exceptions.filter((e) => !e.isResolved).length,
  };

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={t("exceptions.eyebrow")}
        title={t("exceptions.title")}
        subtitle={t("exceptions.subtitle")}
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={t("exceptions.total")} value={stats.total.toString()} icon={<ListChecks size={16} />} />
        <StatTile label={t("exceptions.critical")} value={stats.critical.toString()} icon={<Flame size={16} />} />
        <StatTile label={t("exceptions.high")} value={stats.high.toString()} icon={<TriangleAlert size={16} />} />
        <StatTile label={t("exceptions.unresolved")} value={stats.unresolved.toString()} icon={<Clock size={16} />} />
      </div>

      {exceptions.length === 0 ? (
        <EmptyState title={t("exceptions.empty.title")}>{t("exceptions.empty.body")}</EmptyState>
      ) : (
        <ExceptionList
          exceptions={exceptions.map((e) => ({
            id: e.id,
            supplierOrderId: e.supplierOrderId,
            orderShopifyGid: e.supplierOrder.order.shopifyGid,
            supplier: e.supplierOrder.supplier,
            type: e.exceptionType,
            severity: e.severity,
            description: e.description,
            recommendedAction: e.recommendedAction,
            isResolved: e.isResolved,
            createdAt: e.createdAt,
            userId: e.resolvedBy,
          }))}
          storeId={storeId}
        />
      )}
    </div>
  );
}
