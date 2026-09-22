import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { PageHeader, EmptyState, StatusPill } from "@/components/dashboard/ui/PageHeader";

export default async function ProductsPage({
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

  const products = await prisma.product.findMany({
    where: { storeId },
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: { variants: { select: { price: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Catalog" title="Products" subtitle="Every product synced from this store." />

      {products.length === 0 ? (
        <EmptyState title="No products yet">Products appear here once Shopify sync completes.</EmptyState>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-faint uppercase">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Variants</th>
                <th className="px-5 py-3 text-right font-medium">Price range</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const prices = p.variants.map((v) => v.price?.toNumber() ?? 0).filter((n) => n > 0);
                const min = prices.length ? Math.min(...prices) : null;
                const max = prices.length ? Math.max(...prices) : null;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-white/3">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/products/${p.id}?store=${storeId}`} className="font-medium text-hi hover:text-gold-hi">
                        {p.title}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <StatusPill status={p.status ?? "unknown"} />
                    </td>
                    <td className="px-5 py-3 font-mono text-lo">{p.variants.length}</td>
                    <td className="px-5 py-3 text-right font-mono text-hi">
                      {min === null ? "—" : min === max ? `$${min.toFixed(2)}` : `$${min.toFixed(2)}–$${max!.toFixed(2)}`}
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
