import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import ExceptionList from "@/components/orders/ExceptionList";

export default async function ExceptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ store?: string; status?: string; severity?: string }>;
}) {
  const { store: requestedStoreId, status, severity } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId ?? grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="p-4 text-red-600">No access to this store</div>;
  }

  // Build filters
  const where = {
    supplierOrder: {
      storeId,
    },
  };

  // Fetch exceptions with supplier order details
  const exceptions = await prisma.fulfillmentException.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      supplierOrder: {
        include: {
          order: true,
        },
      },
    },
  });

  const stats = {
    total: exceptions.length,
    critical: exceptions.filter((e) => e.severity === "critical").length,
    high: exceptions.filter((e) => e.severity === "high").length,
    unresolved: exceptions.filter((e) => !e.isResolved).length,
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Fulfillment Exception Center</h1>
        <p className="text-sm text-gray-600">Manage issues across all supplier orders</p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Issues</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Critical</p>
          <p className="text-2xl font-bold text-red-700">{stats.critical}</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm text-orange-700">High</p>
          <p className="text-2xl font-bold text-orange-700">{stats.high}</p>
        </div>
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">Unresolved</p>
          <p className="text-2xl font-bold text-yellow-700">{stats.unresolved}</p>
        </div>
      </div>

      {exceptions.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No exceptions found. Great job! ✨</p>
        </div>
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
    </main>
  );
}
