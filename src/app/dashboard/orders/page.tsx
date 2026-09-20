import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";

export default async function OrderHubPage({
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

  const storeId = requestedStoreId ?? grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="p-4 text-red-600">No access to this store</div>;
  }

  // Fetch orders with supplier orders and fulfillment info
  const orders = await prisma.order.findMany({
    where: { storeId },
    orderBy: { placedAt: "desc" },
    take: 50,
    include: {
      supplierOrders: {
        include: {
          fulfillments: {
            include: {
              shipment: {
                include: {
                  events: {
                    orderBy: { timestamp: "desc" },
                    take: 1,
                  },
                },
              },
            },
          },
          exceptions: {
            where: { isResolved: false },
          },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Order Hub</h1>
        <p className="text-sm text-gray-600">Unified view of all orders and supplier fulfillment</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">No orders yet. Once you receive orders from Shopify, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const totalMargin = order.supplierOrders.reduce((sum, so) => sum + Number(so.estimatedMargin), 0);
            const allCompleted = order.supplierOrders.every(
              (so) => so.status === "delivered" || so.status === "cancelled"
            );

            return (
              <div key={order.id} className="rounded-lg border border-gray-200 p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Order #{order.shopifyGid?.slice(-8)}</p>
                    <p className="text-2xl font-bold">${Number(order.totalPrice).toFixed(2)}</p>
                    <p className="text-sm text-gray-500">{new Date(order.placedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Estimated Margin</p>
                    <p className={`text-2xl font-bold ${totalMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ${totalMargin.toFixed(2)}
                    </p>
                    <p className={`text-xs ${allCompleted ? "text-green-600" : "text-yellow-600"}`}>
                      {allCompleted ? "Completed" : "In Progress"}
                    </p>
                  </div>
                </div>

                {/* Supplier Orders */}
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  {order.supplierOrders.map((supplierOrder) => {
                    const latestEvent = supplierOrder.fulfillments[0]?.shipment?.events[0];

                    return (
                      <div key={supplierOrder.id} className="rounded-md bg-gray-50 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="font-semibold capitalize">{supplierOrder.supplier}</p>
                          <span
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              supplierOrder.status === "delivered"
                                ? "bg-green-100 text-green-700"
                                : supplierOrder.status === "shipped"
                                  ? "bg-blue-100 text-blue-700"
                                  : supplierOrder.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {supplierOrder.status}
                          </span>
                        </div>

                        <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-600">Cost</p>
                            <p className="font-semibold">${Number(supplierOrder.totalCost).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Shipping</p>
                            <p className="font-semibold">${Number(supplierOrder.totalShipping).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Margin</p>
                            <p className="font-semibold">
                              ${Number(supplierOrder.estimatedMargin).toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Tracking */}
                        {latestEvent && (
                          <div className="mb-3 rounded-md bg-white p-2 text-sm">
                            <p className="font-medium">{latestEvent.status}</p>
                            <p className="text-xs text-gray-600">{latestEvent.message}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(latestEvent.timestamp).toLocaleString()}
                            </p>
                          </div>
                        )}

                        {/* Exceptions */}
                        {supplierOrder.exceptions.length > 0 && (
                          <div className="rounded-md border border-red-200 bg-red-50 p-2">
                            <p className="text-xs font-semibold text-red-700">
                              {supplierOrder.exceptions.length} issue{supplierOrder.exceptions.length !== 1 ? "s" : ""}
                            </p>
                            {supplierOrder.exceptions.slice(0, 2).map((exc) => (
                              <p key={exc.id} className="text-xs text-red-600">
                                {exc.exceptionType}: {exc.description.slice(0, 50)}...
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
