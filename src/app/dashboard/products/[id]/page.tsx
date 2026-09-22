import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { contributionProfit, contributionMargin } from "@/lib/finance/formulas";
import type { SupplierLink } from "@prisma/client";
import CostEntryForm from "@/components/products/CostEntryForm";
import CjLinkForm from "@/components/products/CjLinkForm";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { StatTile } from "@/components/dashboard/ui/StatTile";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ store?: string }>;
}) {
  const { id: productId } = await params;
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
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">No access to this store.</div>;
  }

  // Fetch product + variants + sales data
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    include: {
      variants: {
        include: {
          inventoryLevels: { select: { available: true } },
          costAllocations: { select: { amount: true, costType: true } },
          supplierLinks: { where: { supplier: "cj" } },
        },
      },
    },
  });

  if (!product) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">Product not found.</div>;
  }

  // Fetch refunds per variant upfront (needed for economics calculation)
  const variantRefunds: Record<string, number> = {};
  for (const variant of product.variants) {
    const result = await prisma.refundLine.aggregate({
      where: { lineItem: { variantId: variant.id } },
      _sum: { subtotal: true },
    });
    variantRefunds[variant.id] = Number(result._sum.subtotal ?? 0);
  }

  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const cjConnected = !!(await prisma.supplierConnection.findUnique({
    where: { organizationId_supplier: { organizationId: store.organizationId, supplier: "cj" } },
    select: { id: true },
  }));
  const canManageProducts = hasCapability(grants, storeId, CAPABILITIES.productsManage);
  const PAYMENT_FEES_PCT = Number(store.paymentFeePercent);
  const PAYMENT_FEES_FIXED = Number(store.paymentFeeFixed);

  // Get total revenue for the store
  const totalRevenue = await prisma.order.aggregate({
    where: { storeId },
    _sum: { totalPrice: true },
  });

  const storeRevenue = totalRevenue._sum.totalPrice?.toNumber() ?? 0;
  const uniqueCustomers = await prisma.customer.count({ where: { storeId } });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={store.name} title={product.title} />

      {/* Store-level summary first, so the headline numbers are on screen without scrolling. */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Store revenue" value={`$${storeRevenue.toFixed(2)}`} />
        <StatTile label="Customers" value={uniqueCustomers.toLocaleString()} />
        <StatTile
          label="Revenue / customer"
          value={`$${uniqueCustomers > 0 ? (storeRevenue / uniqueCustomers).toFixed(2) : "0.00"}`}
        />
        <StatTile label="Payment fee" value={`${PAYMENT_FEES_PCT}% + $${PAYMENT_FEES_FIXED}`} />
      </div>

      <section className="mb-6">
        <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">Variants</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.variants.map((variant) => {
            const inventory = variant.inventoryLevels.reduce((sum, inv) => sum + inv.available, 0);
            const totalCogs = variant.costAllocations.reduce((sum, alloc) => sum + Number(alloc.amount), 0);

            // For MVP: assume this variant is 1/n of store revenue
            const variantShare = product.variants.length > 0 ? storeRevenue / product.variants.length : 0;
            const refunded = variantRefunds[variant.id] ?? 0;

            // Calculate economics
            const profit = contributionProfit(variantShare, refunded, PAYMENT_FEES_PCT, totalCogs);
            const margin = contributionMargin(variantShare, refunded, PAYMENT_FEES_PCT, totalCogs);

            return (
              <div key={variant.id} className="glass rise-in p-5">
                <p className="font-medium text-hi">{variant.title || "Untitled"}</p>
                <p className="mb-4 text-xs text-faint">SKU: {variant.sku || "—"}</p>

                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <Figure label="Profit" value={`$${profit.toFixed(2)}`} tone={profit >= 0 ? "text-teal" : "text-coral"} />
                  <Figure label="Margin" value={`${margin.toFixed(1)}%`} />
                  <Figure label="Price" value={`$${Number(variant.price ?? 0).toFixed(2)}`} />
                  <Figure
                    label="Cost"
                    value={variant.cost != null ? `$${Number(variant.cost).toFixed(2)}` : "not entered"}
                  />
                  <Figure label="Stock" value={`${inventory} units`} />
                </div>

                {canManageProducts && (
                  <div className="mb-4">
                    <CjLinkForm
                      storeId={storeId}
                      variantId={variant.id}
                      connected={cjConnected}
                      link={cjLinkProps(variant.supplierLinks[0])}
                    />
                  </div>
                )}

                <CostEntryForm variantId={variant.id} storeId={storeId} currentCost={variant.cost?.toString()} />
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass p-5">
        <p className="mb-3 text-sm font-medium text-hi">How these numbers are calculated</p>
        <ul className="space-y-2 text-sm text-lo">
          <li>
            <span className="text-hi">Profit</span> = revenue − refunds − payment fees − cost. Only known costs are
            counted: labor, rent, platform fees and taxes are not.
          </li>
          <li>
            <span className="text-hi">Cost</span> is what you enter per variant, such as your landed or wholesale price.
          </li>
          <li>
            <span className="text-hi">Payment fee</span> is this store&apos;s estimated rate shown above, not
            Shopify&apos;s actual per-order fees.
          </li>
          <li>
            <span className="text-hi">Revenue per variant</span> is currently the store&apos;s revenue split evenly
            across variants, not each variant&apos;s real sales.
          </li>
        </ul>
      </section>
    </div>
  );
}

/** Decimals and Dates can't cross into a client component, so flatten them to strings. */
function cjLinkProps(link: SupplierLink | undefined) {
  if (!link) return null;
  return {
    supplierVariantId: link.supplierVariantId,
    supplierSku: link.supplierSku,
    supplierName: link.supplierName,
    cost: link.cost?.toString() ?? null,
    shippingCost: link.shippingCost?.toString() ?? null,
    shippingMethod: link.shippingMethod,
    shippingDays: link.shippingDays,
    availableQty: link.availableQty,
    lastSyncedAt: link.lastSyncedAt?.toISOString() ?? null,
    syncError: link.syncError,
  };
}

function Figure({ label, value, tone = "text-hi" }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="text-[11px] tracking-wide text-faint uppercase">{label}</p>
      <p className={`font-mono ${tone}`}>{value}</p>
    </div>
  );
}
