import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import { variantEconomics, totalEconomics } from "@/lib/finance/variant-economics";
import type { SupplierLink } from "@prisma/client";
import CostEntryForm from "@/components/products/CostEntryForm";
import CjLinkForm from "@/components/products/CjLinkForm";
import ProductCopyEditor from "@/components/products/ProductCopyEditor";
import CreativeLibrary from "@/components/creative/CreativeLibrary";
import ProductImageZoom from "@/components/products/ProductImageZoom";
import { productImageUrl } from "@/components/products/ProductThumb";
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
          supplierLinks: { where: { supplier: "cj" } },
        },
      },
    },
  });

  if (!product) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">Product not found.</div>;
  }

  // Each variant's real sales, from its own order lines: two grouped queries for the whole product.
  const variantIds = product.variants.map((v) => v.id);
  const [store, lineTotals, refundLines] = await Promise.all([
    prisma.store.findUniqueOrThrow({ where: { id: storeId } }),
    prisma.orderLineItem.groupBy({
      by: ["variantId"],
      where: { storeId, variantId: { in: variantIds } },
      _sum: { quantity: true, netAmount: true },
    }),
    prisma.refundLine.findMany({
      where: { lineItem: { storeId, variantId: { in: variantIds } } },
      select: { subtotal: true, lineItem: { select: { variantId: true } } },
    }),
  ]);
  const cjConnected = !!(await prisma.supplierConnection.findUnique({
    where: { organizationId_supplier: { organizationId: store.organizationId, supplier: "cj" } },
    select: { id: true },
  }));
  const canManageProducts = hasCapability(grants, storeId, CAPABILITIES.productsManage);
  const canUseAi = hasCapability(grants, storeId, CAPABILITIES.aiGenerate);
  const [latestCopy, ideas] = canUseAi
    ? await Promise.all([
        prisma.productAICopy.findFirst({ where: { storeId, productId }, orderBy: { createdAt: "desc" } }),
        prisma.creativeIdea.findMany({ where: { storeId, productId }, orderBy: { createdAt: "desc" }, take: 20 }),
      ])
    : [null, []];
  const feePercent = Number(store.paymentFeePercent);

  const refundsByVariant = new Map<string, number>();
  for (const r of refundLines) {
    const id = r.lineItem?.variantId;
    if (id) refundsByVariant.set(id, (refundsByVariant.get(id) ?? 0) + Number(r.subtotal));
  }
  const economics = new Map(
    product.variants.map((v) => {
      const sold = lineTotals.find((t) => t.variantId === v.id)?._sum;
      return [
        v.id,
        variantEconomics(
          {
            unitsSold: sold?.quantity ?? 0,
            revenue: Number(sold?.netAmount ?? 0),
            refunds: refundsByVariant.get(v.id) ?? 0,
          },
          v.cost == null ? null : Number(v.cost),
          feePercent
        ),
      ];
    })
  );
  const total = totalEconomics([...economics.values()]);
  const money = (n: number) => `$${n.toFixed(2)}`;
  const imageUrl = productImageUrl(product.raw);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow={store.name} title={product.title} />

      {/* This product's own totals first, so the headline numbers are on screen without scrolling. */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        {imageUrl && <ProductImageZoom url={imageUrl} alt={product.title} />}
        <div className="grid flex-1 grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile label="Revenue" value={money(total.revenue)} />
          <StatTile label="Units sold" value={total.unitsSold.toLocaleString()} />
          <StatTile label="Profit" value={total.profit === null ? "Cost needed" : money(total.profit)} />
          <StatTile label="Margin" value={total.margin === null ? "—" : `${total.margin.toFixed(1)}%`} />
        </div>
      </div>

      <section className="mb-6">
        <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">Variants</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.variants.map((variant) => {
            const inventory = variant.inventoryLevels.reduce((sum, inv) => sum + inv.available, 0);
            const e = economics.get(variant.id)!;

            return (
              <div key={variant.id} className="glass rise-in p-5">
                <p className="font-medium text-hi">{variant.title || "Untitled"}</p>
                <p className="mb-4 text-xs text-faint">SKU: {variant.sku || "—"}</p>

                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <Figure label="Revenue" value={money(e.revenue)} />
                  <Figure label="Units sold" value={e.unitsSold.toLocaleString()} />
                  <Figure
                    label="Profit"
                    value={e.profit === null ? "enter cost" : money(e.profit)}
                    tone={e.profit === null ? "text-faint" : e.profit >= 0 ? "text-teal" : "text-coral"}
                  />
                  <Figure label="Margin" value={e.margin === null ? "—" : `${e.margin.toFixed(1)}%`} />
                  {e.refunds > 0 && <Figure label="Refunds" value={money(e.refunds)} tone="text-coral" />}
                  <Figure label="Price" value={money(Number(variant.price ?? 0))} />
                  <Figure label="Unit cost" value={variant.cost != null ? money(Number(variant.cost)) : "not entered"} />
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

      {canUseAi && (
        <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="glass p-5">
            <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">AI product copy</p>
            <ProductCopyEditor
              storeId={storeId}
              productId={productId}
              initialCopy={
                latestCopy
                  ? {
                      id: latestCopy.id,
                      headline: latestCopy.headline,
                      description: latestCopy.description,
                      bulletPoints: latestCopy.bulletPoints,
                      seoKeywords: latestCopy.seoKeywords,
                      confidence: latestCopy.confidence,
                      isPublished: latestCopy.isPublished,
                    }
                  : undefined
              }
            />
          </div>
          <div className="glass p-5">
            <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">Ad creative ideas</p>
            <CreativeLibrary
              storeId={storeId}
              productId={productId}
              initialIdeas={ideas.map((idea) => ({
                id: idea.id,
                headlineText: idea.headlineText,
                headlineHook: idea.headlineHook,
                headlineCta: idea.headlineCta,
                imageConceptText: idea.imageConceptText,
                videoConceptText: idea.videoConceptText,
                targetAudience: idea.targetAudience,
                emotionalApeals: idea.emotionalApeals,
                createdAt: idea.createdAt.toISOString(),
              }))}
            />
          </div>
        </section>
      )}

      <section className="glass p-5">
        <p className="mb-3 text-sm font-medium text-hi">How these numbers are calculated</p>
        <ul className="space-y-2 text-sm text-lo">
          <li>
            <span className="text-hi">Revenue</span> is what customers paid for each variant after discounts, from
            every synced order, all time.
          </li>
          <li>
            <span className="text-hi">Profit</span> = revenue − refunds − payment fees − unit cost × units sold. Only
            known costs are counted: labor, rent, platform fees and taxes are not.
          </li>
          <li>
            <span className="text-hi">Unit cost</span> is what you enter, or CJ&apos;s price + shipping when the
            variant is linked to CJ. Without one, profit shows as unknown instead of assuming free goods.
          </li>
          <li>
            <span className="text-hi">Payment fees</span> use this store&apos;s estimated rate ({feePercent}%) on
            revenue before refunds, not Shopify&apos;s actual per-order fees.
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
