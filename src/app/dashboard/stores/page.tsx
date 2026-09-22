import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants } from "@/lib/auth/capabilities";
import { PageHeader, EmptyState, StatusPill } from "@/components/dashboard/ui/PageHeader";
import ConnectStoreForm from "@/components/dashboard/ConnectStoreForm";
import { Package, ShoppingBag } from "lucide-react";

export default async function StoresPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const stores = await prisma.store.findMany({
    where: { id: { in: grants.map((g) => g.storeId) } },
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true, products: true } } },
  });

  const revenueByStore = await prisma.order.groupBy({
    by: ["storeId"],
    where: { storeId: { in: stores.map((s) => s.id) } },
    _sum: { totalPrice: true },
  });
  const revenueMap = new Map(revenueByStore.map((r) => [r.storeId, r._sum.totalPrice?.toNumber() ?? 0]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Multi-store"
        title="Your stores"
        subtitle="Manage and grow every Shopify store in one place."
        action={
          <details className="group">
            <summary className="glass-hover glass cursor-pointer list-none px-4 py-2 text-sm font-medium text-hi">
              + Connect store
            </summary>
            <div className="glass mt-2 w-80 p-4">
              <ConnectStoreForm />
            </div>
          </details>
        }
      />

      {stores.length === 0 ? (
        <EmptyState title="No stores yet">Connect your first Shopify store to get started.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/dashboard?store=${store.id}`}
              className="glass glass-hover rise-in flex flex-col gap-4 p-5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-[family-name:var(--font-display)] text-lg text-hi italic">{store.name}</p>
                  <p className="mt-0.5 truncate text-xs text-faint">{store.shopDomain}</p>
                </div>
                <StatusPill status={store.status} />
              </div>
              <div className="flex items-center gap-5 border-t border-line pt-4">
                <Stat icon={<ShoppingBag size={14} />} label="orders" value={store._count.orders} />
                <Stat icon={<Package size={14} />} label="products" value={store._count.products} />
              </div>
              <p className="font-mono text-2xl font-medium text-hi">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
                  revenueMap.get(store.id) ?? 0
                )}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-lo">
      <span className="text-faint">{icon}</span>
      <span className="font-mono font-medium text-hi">{value.toLocaleString()}</span>
      {label}
    </div>
  );
}
