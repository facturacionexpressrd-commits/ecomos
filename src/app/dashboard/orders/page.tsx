import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader, EmptyState, StatusPill } from "@/components/dashboard/ui/PageHeader";
import SendToCjButton from "@/components/orders/SendToCjButton";

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

  const storeId = requestedStoreId && grants.some((g) => g.storeId === requestedStoreId) ? requestedStoreId : grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { organizationId: true } });
  const cjConnected = !!(await prisma.supplierConnection.findUnique({
    where: { organizationId_supplier: { organizationId: store.organizationId, supplier: "cj" } },
    select: { id: true },
  }));
  const canSend = cjConnected && hasCapability(grants, storeId, CAPABILITIES.storeSync);

  const orders = await prisma.order.findMany({
    where: { storeId },
    orderBy: { placedAt: "desc" },
    take: 50,
    include: {
      lineItems: { select: { variant: { select: { supplierLinks: { where: { supplier: "cj" }, select: { id: true } } } } } },
      supplierOrders: {
        include: {
          fulfillments: {
            include: {
              shipment: {
                include: {
                  events: { orderBy: { timestamp: "desc" }, take: 1 },
                },
              },
            },
          },
          exceptions: { where: { isResolved: false } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Fulfillment" title="Order Hub" subtitle="Unified view of every order and its supplier fulfillment." />

      {orders.length === 0 ? (
        <EmptyState title="No orders yet">Once you receive orders from Shopify, they&apos;ll appear here.</EmptyState>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const totalMargin = order.supplierOrders.reduce((sum, so) => sum + Number(so.estimatedMargin), 0);
            const allCompleted =
              order.supplierOrders.length > 0 &&
              order.supplierOrders.every((so) => so.status === "delivered" || so.status === "cancelled");
            const cjLinkedItems = order.lineItems.filter((li) => (li.variant?.supplierLinks.length ?? 0) > 0).length;
            const showSendToCj = canSend && cjLinkedItems > 0 && !order.supplierOrders.some((so) => so.supplier === "cj");

            return (
              <div key={order.id} className="glass rise-in p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-faint">Order #{order.shopifyGid?.slice(-8)}</p>
                    <p className="font-mono text-2xl font-medium text-hi">${Number(order.totalPrice).toFixed(2)}</p>
                    <p className="mt-0.5 text-xs text-lo">{new Date(order.placedAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-faint">Estimated margin</p>
                    <p className={`font-mono text-xl font-medium ${totalMargin >= 0 ? "text-teal" : "text-coral"}`}>
                      ${totalMargin.toFixed(2)}
                    </p>
                    {order.supplierOrders.length > 0 && (
                      <p className={`text-xs ${allCompleted ? "text-teal" : "text-gold"}`}>
                        {allCompleted ? "Completed" : "In progress"}
                      </p>
                    )}
                    {showSendToCj && (
                      <div className="mt-2">
                        <SendToCjButton storeId={storeId} orderId={order.id} linkedItems={cjLinkedItems} />
                      </div>
                    )}
                  </div>
                </div>

                {order.supplierOrders.length > 0 && (
                  <div className="space-y-3 border-t border-line pt-4">
                    {order.supplierOrders.map((supplierOrder) => {
                      const latestEvent = supplierOrder.fulfillments[0]?.shipment?.events[0];
                      return (
                        <div key={supplierOrder.id} className="rounded-lg border border-line bg-white/3 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-medium text-hi">
                              {supplierOrder.supplier === "cj" ? "CJ Dropshipping" : supplierOrder.supplier}
                              {supplierOrder.supplierOrderId && (
                                <span className="ml-2 font-mono text-xs text-faint">#{supplierOrder.supplierOrderId}</span>
                              )}
                            </p>
                            <StatusPill status={supplierOrder.status} />
                          </div>
                          {supplierOrder.status === "awaiting_payment" && (
                            <p className="mb-3 rounded-lg bg-gold/10 p-2.5 text-xs text-gold-hi">
                              Created at CJ, not paid yet. Pay it in your CJ account and CJ will start fulfilling.
                            </p>
                          )}
                          {supplierOrder.fulfillments[0]?.shipment?.trackingNumber && (
                            <p className="mb-3 text-xs text-lo">
                              Tracking:{" "}
                              <span className="font-mono text-hi">{supplierOrder.fulfillments[0].shipment.trackingNumber}</span>
                              {supplierOrder.fulfillments[0].shipment.carrier && ` · ${supplierOrder.fulfillments[0].shipment.carrier}`}
                            </p>
                          )}

                          <div className="mb-3 grid grid-cols-3 gap-2 text-sm">
                            <Field label="Cost" value={`$${Number(supplierOrder.totalCost).toFixed(2)}`} />
                            <Field label="Shipping" value={`$${Number(supplierOrder.totalShipping).toFixed(2)}`} />
                            <Field label="Margin" value={`$${Number(supplierOrder.estimatedMargin).toFixed(2)}`} />
                          </div>

                          {latestEvent && (
                            <div className="mb-3 rounded-lg bg-white/5 p-2.5 text-sm">
                              <p className="font-medium text-hi">{latestEvent.status}</p>
                              <p className="text-xs text-lo">{latestEvent.message}</p>
                              <p className="text-xs text-faint">{new Date(latestEvent.timestamp).toLocaleString()}</p>
                            </div>
                          )}

                          {supplierOrder.exceptions.length > 0 && (
                            <div className="rounded-lg border border-coral/30 bg-coral/10 p-2.5">
                              <p className="text-xs font-semibold text-coral">
                                {supplierOrder.exceptions.length} issue{supplierOrder.exceptions.length !== 1 ? "s" : ""}
                              </p>
                              {supplierOrder.exceptions.slice(0, 2).map((exc) => (
                                <p key={exc.id} className="text-xs text-coral/90">
                                  {exc.exceptionType}: {exc.description.slice(0, 50)}...
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-faint">{label}</p>
      <p className="font-mono font-medium text-hi">{value}</p>
    </div>
  );
}
