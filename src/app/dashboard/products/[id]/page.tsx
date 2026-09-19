import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { loadStoreAccessGrants, hasCapability, CAPABILITIES } from "@/lib/auth/capabilities";
import {
  contributionProfit,
  contributionMargin,
  variantContribution,
  variantContributionMargin,
} from "@/lib/finance/formulas";
import CostEntryForm from "@/components/products/CostEntryForm";
import VariantEconomicsCard from "@/components/products/VariantEconomicsCard";

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
    return <div className="p-4 text-red-600">No access to this store</div>;
  }

  // Fetch product + variants + sales data
  const product = await prisma.product.findFirst({
    where: { id: productId, storeId },
    include: {
      variants: {
        include: {
          inventoryLevels: { select: { available: true } },
          costAllocations: { select: { amount: true, costType: true } },
        },
      },
    },
  });

  if (!product) return <div className="p-4 text-red-600">Product not found</div>;

  // Get variant sales (sum orders containing this variant)
  const variantSales = await prisma.order.findMany({
    where: { storeId },
    include: {
      customer: { select: { id: true } },
    },
    select: {
      id: true,
      totalPrice: true,
      customer: { select: { id: true } },
    },
  });

  // For demo, compute basic economics per variant
  // Real implementation would join order_line_items to get variant-specific sales
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  const PAYMENT_FEES_PCT = 2.9; // Stripe default

  // Get total revenue for the store (crude, but works for MVP)
  const totalRevenue = await prisma.order.aggregate({
    where: { storeId },
    _sum: { totalPrice: true },
  });

  const storeRevenue = totalRevenue._sum.totalPrice?.toNumber() ?? 0;
  const uniqueCustomers = await prisma.customer.count({ where: { storeId } });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{product.title}</h1>
        <p className="text-sm text-gray-600">Store: {store.name}</p>
      </div>

      {/* Variants Grid */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold">Variants</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {product.variants.map((variant) => {
            const inventory = variant.inventoryLevels.reduce((sum, inv) => sum + inv.available, 0);
            const totalCogs = variant.costAllocations.reduce((sum, alloc) => sum + Number(alloc.amount), 0);

            // For MVP: assume this variant is 1/n of store revenue
            const variantShare = product.variants.length > 0 ? storeRevenue / product.variants.length : 0;
            const variantRefunds = 0; // TODO: track refunds per variant

            // Calculate economics
            const profit = contributionProfit(variantShare, variantRefunds, PAYMENT_FEES_PCT, totalCogs);
            const margin = contributionMargin(variantShare, variantRefunds, PAYMENT_FEES_PCT, totalCogs);

            return (
              <div key={variant.id} className="rounded-lg border border-gray-200 p-6">
                <h3 className="mb-2 font-semibold">{variant.title || "Untitled"}</h3>
                <p className="mb-4 text-sm text-gray-600">SKU: {variant.sku || "—"}</p>

                {/* Pricing & Inventory */}
                <div className="mb-4 space-y-1 text-sm">
                  <p>
                    <strong>Price:</strong> ${Number(variant.price ?? 0).toFixed(2)}
                  </p>
                  <p>
                    <strong>Cost:</strong> ${Number(variant.cost ?? 0).toFixed(2)}
                  </p>
                  <p>
                    <strong>Stock:</strong> {inventory} units
                  </p>
                </div>

                {/* Economics */}
                <div className="mb-6 space-y-2 rounded-md bg-blue-50 p-4 text-sm">
                  <p>
                    <strong>Contribution Profit:</strong> ${profit.toFixed(2)}
                    <br />
                    <em className="text-xs text-gray-700">
                      = (Revenue - Refunds - Payment Fees) - COGS
                    </em>
                  </p>
                  <p>
                    <strong>Contribution Margin:</strong> {margin.toFixed(1)}%
                    <br />
                    <em className="text-xs text-gray-700">
                      = Contribution Profit ÷ Revenue
                    </em>
                  </p>
                </div>

                {/* Cost Entry Form */}
                <CostEntryForm variantId={variant.id} storeId={storeId} currentCost={variant.cost?.toString()} />
              </div>
            );
          })}
        </div>
      </section>

      {/* Store-Level Summary */}
      <section className="rounded-lg border border-gray-200 p-8">
        <h2 className="mb-6 text-xl font-semibold">Store Economics</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-600">Gross Revenue</p>
            <p className="text-2xl font-bold">${storeRevenue.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">Sum of all orders</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Unique Customers</p>
            <p className="text-2xl font-bold">{uniqueCustomers}</p>
            <p className="mt-1 text-xs text-gray-500">From Shopify data</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Payment Fee Rate</p>
            <p className="text-2xl font-bold">{PAYMENT_FEES_PCT}%</p>
            <p className="mt-1 text-xs text-gray-500">Stripe default (hardcoded for MVP)</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Revenue/Customer</p>
            <p className="text-2xl font-bold">
              ${uniqueCustomers > 0 ? (storeRevenue / uniqueCustomers).toFixed(2) : "0.00"}
            </p>
            <p className="mt-1 text-xs text-gray-500">For break-even analysis</p>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section className="mt-12 rounded-lg bg-gray-50 p-8">
        <h3 className="mb-4 font-semibold">📌 Methodology</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>
            <strong>Contribution Profit:</strong> Only includes known costs (COGS from your entries, Stripe fees).
            Excludes labor, rent, platform fees, taxes.
          </li>
          <li>
            <strong>COGS Entry:</strong> Manual per-variant cost. Use this for your landed cost or wholesale price.
          </li>
          <li>
            <strong>Payment Fees:</strong> Fixed at 2.9% (Stripe standard). Update this if using a different processor.
          </li>
          <li>
            <strong>Refunds:</strong> Not yet tracked per variant. Revenue shown is gross (before refunds).
          </li>
          <li>
            <strong>Attribution:</strong> For MVP, revenue is split equally across variants. Real impl. uses order_line_items.
          </li>
        </ul>
      </section>
    </main>
  );
}
