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
import DeleteProductButton from "@/components/products/DeleteProductButton";
import { productImageUrl } from "@/components/products/ProductThumb";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { StatTile } from "@/components/dashboard/ui/StatTile";
import { getT } from "@/lib/i18n/server";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ store?: string }>;
}) {
  const { id: productId } = await params;
  const { store: requestedStoreId } = await searchParams;
  const t = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const grants = await loadStoreAccessGrants(user.id);
  if (grants.length === 0) redirect("/dashboard");

  const storeId = requestedStoreId ?? grants[0].storeId;
  if (!hasCapability(grants, storeId, CAPABILITIES.storeRead)) {
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">{t("common.noAccessStore")}</div>;
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
    return <div className="glass mx-auto mt-16 max-w-md p-8 text-center text-sm text-lo">{t("productDetail.notFound")}</div>;
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
      <PageHeader
        eyebrow={store.name}
        title={product.title}
        action={
          canManageProducts ? (
            <DeleteProductButton storeId={storeId} productId={product.id} productTitle={product.title} />
          ) : undefined
        }
      />

      {/* This product's own totals first, so the headline numbers are on screen without scrolling. */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row">
        {imageUrl && <ProductImageZoom url={imageUrl} alt={product.title} />}
        <div className={`grid flex-1 content-start gap-4 grid-cols-2 ${imageUrl ? "" : "lg:grid-cols-4"}`}>
          <StatTile label={t("productDetail.revenue")} value={money(total.revenue)} />
          <StatTile label={t("productDetail.unitsSold")} value={total.unitsSold.toLocaleString()} />
          <StatTile
            label={t("productDetail.profit")}
            value={total.profit === null ? t("productDetail.costNeeded") : money(total.profit)}
          />
          <StatTile
            label={t("productDetail.margin")}
            value={total.margin === null ? t("common.none") : `${total.margin.toFixed(1)}%`}
          />
        </div>
      </div>

      <section className="mb-6">
        <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">{t("productDetail.variants")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {product.variants.map((variant) => {
            const inventory = variant.inventoryLevels.reduce((sum, inv) => sum + inv.available, 0);
            const e = economics.get(variant.id)!;

            return (
              <div key={variant.id} className="glass rise-in p-5">
                <p className="font-medium text-hi">{variant.title || t("productDetail.untitled")}</p>
                <p className="mb-4 text-xs text-faint">
                  {t("productDetail.sku", { sku: variant.sku || t("common.none") })}
                </p>

                <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
                  <Figure label={t("productDetail.revenue")} value={money(e.revenue)} />
                  <Figure label={t("productDetail.unitsSold")} value={e.unitsSold.toLocaleString()} />
                  <Figure
                    label={t("productDetail.profit")}
                    value={e.profit === null ? t("productDetail.enterCost") : money(e.profit)}
                    tone={e.profit === null ? "text-faint" : e.profit >= 0 ? "text-teal" : "text-coral"}
                  />
                  <Figure
                    label={t("productDetail.margin")}
                    value={e.margin === null ? t("common.none") : `${e.margin.toFixed(1)}%`}
                  />
                  {e.refunds > 0 && (
                    <Figure label={t("productDetail.refunds")} value={money(e.refunds)} tone="text-coral" />
                  )}
                  <Figure label={t("productDetail.price")} value={money(Number(variant.price ?? 0))} />
                  <Figure
                    label={t("productDetail.unitCost")}
                    value={variant.cost != null ? money(Number(variant.cost)) : t("productDetail.notEntered")}
                  />
                  <Figure
                    label={t("productDetail.stock")}
                    value={t("productDetail.stockUnits", { count: inventory })}
                  />
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
            <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">{t("productDetail.aiCopy")}</p>
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
            <p className="mb-3 text-xs font-medium tracking-[0.14em] text-faint uppercase">{t("productDetail.creativeIdeas")}</p>
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
        <p className="mb-3 text-sm font-medium text-hi">{t("productDetail.howCalculated")}</p>
        <ul className="space-y-2 text-sm text-lo">
          <li>
            <span className="text-hi">{t("productDetail.calc.revenueLabel")}</span>{" "}
            {t("productDetail.calc.revenue")}
          </li>
          <li>
            <span className="text-hi">{t("productDetail.calc.profitLabel")}</span>{" "}
            {t("productDetail.calc.profit")}
          </li>
          <li>
            <span className="text-hi">{t("productDetail.calc.unitCostLabel")}</span>{" "}
            {t("productDetail.calc.unitCost")}
          </li>
          <li>
            <span className="text-hi">{t("productDetail.calc.feesLabel")}</span>{" "}
            {t("productDetail.calc.fees", { percent: feePercent })}
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
