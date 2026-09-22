import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader, EmptyState } from "@/components/dashboard/ui/PageHeader";

export default async function CustomersPage({
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

  const customers = await prisma.customer.findMany({
    where: { storeId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { orders: { select: { totalPrice: true, currency: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Audience" title="Customers" subtitle="Everyone who has ordered from this store." />

      {customers.length === 0 ? (
        <EmptyState title="No customers yet">Customers appear here once Shopify sync completes.</EmptyState>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-faint uppercase">
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Orders</th>
                <th className="px-5 py-3 text-right font-medium">Total spend</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const spend = c.orders.reduce((s, o) => s + o.totalPrice.toNumber(), 0);
                const currency = c.orders[0]?.currency ?? "USD";
                return (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-white/3">
                    <td className="px-5 py-3 font-medium text-hi">{c.name || "—"}</td>
                    <td className="px-5 py-3 text-lo">{c.email || "—"}</td>
                    <td className="px-5 py-3 font-mono text-lo">{c.orders.length}</td>
                    <td className="px-5 py-3 text-right font-mono text-hi">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(spend)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
