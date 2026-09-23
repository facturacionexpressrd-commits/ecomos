import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { shopifyGraphQL } from "@/lib/shopify/client";

type PageInfo = { hasNextPage: boolean; endCursor: string | null };

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($cursor: String, $query: String) {
    products(first: 15, after: $cursor, sortKey: UPDATED_AT, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        updatedAt
        title
        status
        featuredMedia { preview { image { url } } }
        variants(first: 30) {
          nodes {
            id
            sku
            title
            price
            inventoryItem {
              id
              inventoryLevels(first: 5) {
                nodes {
                  location { id }
                  quantities(names: ["available"]) { name quantity }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const CUSTOMERS_QUERY = /* GraphQL */ `
  query Customers($cursor: String, $query: String) {
    customers(first: 50, after: $cursor, sortKey: UPDATED_AT, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes { id updatedAt email displayName }
    }
  }
`;

const ORDERS_QUERY = /* GraphQL */ `
  query Orders($cursor: String, $query: String) {
    orders(first: 50, after: $cursor, sortKey: UPDATED_AT, query: $query) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        updatedAt
        name
        createdAt
        displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        customer { id }
        lineItems(first: 100) {
          nodes {
            id
            quantity
            variant { id }
            originalTotalSet { shopMoney { amount } }
            discountedTotalSet { shopMoney { amount } }
          }
        }
        refunds {
          id
          createdAt
          totalRefundedSet { shopMoney { amount currencyCode } }
          refundLineItems(first: 100) {
            nodes {
              quantity
              subtotalSet { shopMoney { amount } }
              lineItem { id }
            }
          }
        }
        transactions {
          id
          kind
          status
          gateway
          processedAt
          amountSet { shopMoney { amount currencyCode } }
        }
      }
    }
  }
`;

type ProductsResponse = {
  products: {
    pageInfo: PageInfo;
    nodes: Array<{
      id: string;
      updatedAt: string;
      title: string;
      status: string;
      featuredMedia: { preview: { image: { url: string } | null } | null } | null;
      variants: {
        nodes: Array<{
          id: string;
          sku: string | null;
          title: string | null;
          price: string;
          inventoryItem: {
            id: string;
            inventoryLevels: {
              nodes: Array<{
                location: { id: string };
                quantities: Array<{ name: string; quantity: number }>;
              }>;
            };
          };
        }>;
      };
    }>;
  };
};

type CustomersResponse = {
  customers: {
    pageInfo: PageInfo;
    nodes: Array<{ id: string; updatedAt: string; email: string | null; displayName: string | null }>;
  };
};

type OrdersResponse = {
  orders: {
    pageInfo: PageInfo;
    nodes: Array<{
      id: string;
      updatedAt: string;
      name: string;
      createdAt: string;
      displayFinancialStatus: string | null;
      currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
      customer: { id: string } | null;
      lineItems: {
        nodes: Array<{
          id: string;
          quantity: number;
          variant: { id: string } | null;
          originalTotalSet: { shopMoney: { amount: string } };
          discountedTotalSet: { shopMoney: { amount: string } };
        }>;
      };
      refunds: Array<{
        id: string;
        createdAt: string;
        totalRefundedSet: { shopMoney: { amount: string; currencyCode: string } };
        refundLineItems: {
          nodes: Array<{
            quantity: number;
            subtotalSet: { shopMoney: { amount: string } };
            lineItem: { id: string } | null;
          }>;
        };
      }>;
      transactions: Array<{
        id: string;
        kind: string;
        status: string;
        gateway: string | null;
        processedAt: string | null;
        amountSet: { shopMoney: { amount: string; currencyCode: string } };
      }>;
    }>;
  };
};

const WATERMARK = {
  customers: "customersSyncedAt",
  products: "productsSyncedAt",
  orders: "ordersSyncedAt",
} as const;
type Resource = keyof typeof WATERMARK;

/**
 * Shopify search filter for "changed since the watermark". Inclusive (>=) so records sharing the
 * watermark's exact timestamp are re-read rather than skipped; re-saving them is a harmless upsert.
 */
export function updatedSinceQuery(since: Date | null): string | null {
  return since ? `updated_at:>='${since.toISOString()}'` : null;
}

type Ctx = { storeId: string; shop: string; accessToken: string; deadline: number };

/**
 * Pages through one resource oldest-change-first, saving each record, and moves the resource's
 * watermark forward after every page. So a sync cut short (deadline, timeout, crash) resumes from
 * where it got to, and the next sync only fetches what changed since. Returns false if it stopped
 * early because the deadline passed.
 */
async function syncChanged<N extends { updatedAt: string }>(
  ctx: Ctx,
  resource: Resource,
  since: Date | null,
  fetchPage: (vars: { cursor: string | null; query: string | null }) => Promise<{ nodes: N[]; pageInfo: PageInfo }>,
  save: (node: N) => Promise<void>
): Promise<boolean> {
  const query = updatedSinceQuery(since);
  let cursor: string | null = null;
  do {
    if (Date.now() > ctx.deadline) return false;
    const page: { nodes: N[]; pageInfo: PageInfo } = await fetchPage({ cursor, query });
    for (const node of page.nodes) await save(node);
    const last = page.nodes.at(-1);
    if (last) {
      await prisma.store.update({ where: { id: ctx.storeId }, data: { [WATERMARK[resource]]: new Date(last.updatedAt) } });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);
  return true;
}

async function syncCustomers(ctx: Ctx, since: Date | null) {
  const { storeId, shop, accessToken } = ctx;
  return syncChanged(
    ctx,
    "customers",
    since,
    async (vars) => (await shopifyGraphQL<CustomersResponse>(shop, accessToken, CUSTOMERS_QUERY, vars)).customers,
    async (c) => {
      await prisma.customer.upsert({
        where: { storeId_shopifyGid: { storeId, shopifyGid: c.id } },
        create: {
          storeId,
          shopifyGid: c.id,
          email: c.email,
          name: c.displayName,
          raw: c as object,
        },
        update: { email: c.email, name: c.displayName, raw: c as object },
      });
    }
  );
}

async function syncProducts(ctx: Ctx, since: Date | null) {
  const { storeId, shop, accessToken } = ctx;
  return syncChanged(
    ctx,
    "products",
    since,
    async (vars) => (await shopifyGraphQL<ProductsResponse>(shop, accessToken, PRODUCTS_QUERY, vars)).products,
    async (p) => {
      const product = await prisma.product.upsert({
        where: { storeId_shopifyGid: { storeId, shopifyGid: p.id } },
        create: { storeId, shopifyGid: p.id, title: p.title, status: p.status, raw: p as object },
        update: { title: p.title, status: p.status, raw: p as object },
      });

      for (const v of p.variants.nodes) {
        const variant = await prisma.productVariant.upsert({
          where: { storeId_shopifyGid: { storeId, shopifyGid: v.id } },
          create: {
            storeId,
            productId: product.id,
            shopifyGid: v.id,
            inventoryItemGid: v.inventoryItem.id,
            sku: v.sku,
            title: v.title,
            price: v.price,
            raw: v as object,
          },
          update: { inventoryItemGid: v.inventoryItem.id, sku: v.sku, title: v.title, price: v.price, raw: v as object },
        });

        for (const level of v.inventoryItem.inventoryLevels.nodes) {
          const available = level.quantities.find((q) => q.name === "available")?.quantity ?? 0;
          await prisma.inventoryLevel.upsert({
            where: { variantId_locationGid: { variantId: variant.id, locationGid: level.location.id } },
            create: { storeId, variantId: variant.id, locationGid: level.location.id, available },
            update: { available },
          });
        }
      }
    }
  );
}

async function syncOrders(ctx: Ctx, since: Date | null) {
  const { storeId, shop, accessToken } = ctx;
  // Line items reference our ProductVariant.id, not Shopify's gid; products sync first, so this is complete.
  const variants = await prisma.productVariant.findMany({ where: { storeId }, select: { id: true, shopifyGid: true } });
  const variantIdByGid = new Map(variants.map((v) => [v.shopifyGid, v.id]));

  return syncChanged(
    ctx,
    "orders",
    since,
    async (vars) => (await shopifyGraphQL<OrdersResponse>(shop, accessToken, ORDERS_QUERY, vars)).orders,
    async (o) => {
      const customer = o.customer
        ? await prisma.customer.findUnique({
            where: { storeId_shopifyGid: { storeId, shopifyGid: o.customer.id } },
          })
        : null;

      const order = await prisma.order.upsert({
        where: { storeId_shopifyGid: { storeId, shopifyGid: o.id } },
        create: {
          storeId,
          customerId: customer?.id,
          shopifyGid: o.id,
          name: o.name,
          totalPrice: o.currentTotalPriceSet.shopMoney.amount,
          currency: o.currentTotalPriceSet.shopMoney.currencyCode,
          financialStatus: o.displayFinancialStatus,
          placedAt: new Date(o.createdAt),
          raw: o as object,
        },
        update: {
          customerId: customer?.id,
          totalPrice: o.currentTotalPriceSet.shopMoney.amount,
          financialStatus: o.displayFinancialStatus,
          raw: o as object,
        },
      });

      // Sync line items (revenue facts)
      for (const line of o.lineItems.nodes) {
        await prisma.orderLineItem.upsert({
          where: { orderId_shopifyGid: { orderId: order.id, shopifyGid: line.id } },
          create: {
            storeId,
            orderId: order.id,
            variantId: (line.variant && variantIdByGid.get(line.variant.id)) ?? null,
            shopifyGid: line.id,
            quantity: line.quantity,
            grossAmount: line.originalTotalSet.shopMoney.amount,
            netAmount: line.discountedTotalSet.shopMoney.amount,
          },
          update: {
            variantId: (line.variant && variantIdByGid.get(line.variant.id)) ?? null,
            quantity: line.quantity,
            grossAmount: line.originalTotalSet.shopMoney.amount,
            netAmount: line.discountedTotalSet.shopMoney.amount,
          },
        });
      }

      // Sync refunds
      for (const ref of o.refunds) {
        const refund = await prisma.refund.upsert({
          where: { storeId_shopifyGid: { storeId, shopifyGid: ref.id } },
          create: {
            storeId,
            orderId: order.id,
            shopifyGid: ref.id,
            amount: ref.totalRefundedSet.shopMoney.amount,
            refundedAt: new Date(ref.createdAt),
          },
          update: {
            amount: ref.totalRefundedSet.shopMoney.amount,
            refundedAt: new Date(ref.createdAt),
          },
        });

        // Sync refund line items (which order line was refunded)
        for (const rline of ref.refundLineItems.nodes) {
          const lineItem = rline.lineItem
            ? await prisma.orderLineItem.findUnique({
                where: { orderId_shopifyGid: { orderId: order.id, shopifyGid: rline.lineItem.id } },
              })
            : null;

          // Only upsert if there's a matching line item; Shopify allows refunds on deleted lines too.
          if (lineItem) {
            await prisma.refundLine.upsert({
              where: {
                refundId_lineItemId: { refundId: refund.id, lineItemId: lineItem.id },
              },
              create: {
                refundId: refund.id,
                lineItemId: lineItem.id,
                quantity: rline.quantity,
                subtotal: rline.subtotalSet.shopMoney.amount,
              },
              update: {
                quantity: rline.quantity,
                subtotal: rline.subtotalSet.shopMoney.amount,
              },
            });
          }
        }
      }

      // Sync payment transactions
      for (const tx of o.transactions) {
        await prisma.financialTransaction.upsert({
          where: { storeId_shopifyGid: { storeId, shopifyGid: tx.id } },
          create: {
            storeId,
            orderId: order.id,
            shopifyGid: tx.id,
            kind: tx.kind,
            status: tx.status,
            gateway: tx.gateway,
            amount: tx.amountSet.shopMoney.amount,
            currency: tx.amountSet.shopMoney.currencyCode,
            processedAt: tx.processedAt ? new Date(tx.processedAt) : null,
          },
          update: {
            status: tx.status,
            processedAt: tx.processedAt ? new Date(tx.processedAt) : null,
          },
        });
      }
    }
  );
}

/**
 * Incremental sync: only what changed since each resource's watermark (everything on the first
 * run). Customers first (orders reference them), then products+inventory, then orders. Returns
 * false if it ran out of time before finishing; the progress made so far is kept, and calling it
 * again continues from there.
 */
export async function syncStore(storeId: string, deadline = Infinity): Promise<boolean> {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  if (!store.accessTokenEncrypted) throw new Error(`Store ${storeId} has no access token — connect it first`);
  const ctx: Ctx = { storeId, shop: store.shopDomain, accessToken: decryptSecret(store.accessTokenEncrypted), deadline };

  return (
    (await syncCustomers(ctx, store.customersSyncedAt)) &&
    (await syncProducts(ctx, store.productsSyncedAt)) &&
    (await syncOrders(ctx, store.ordersSyncedAt))
  );
}

/**
 * inventory_levels/update carries the new stock level itself, so apply it directly: one write
 * instead of a sync. (Product updatedAt doesn't change on stock moves, so an incremental product
 * sync wouldn't catch them.) Returns false if the variant isn't known yet; a product sync will.
 */
export async function applyInventoryWebhook(
  storeId: string,
  payload: { inventory_item_id?: number | string; location_id?: number | string; available?: number | null }
): Promise<boolean> {
  if (payload.inventory_item_id == null || payload.location_id == null) return false;
  const variant = await prisma.productVariant.findFirst({
    where: { storeId, inventoryItemGid: `gid://shopify/InventoryItem/${payload.inventory_item_id}` },
    select: { id: true },
  });
  if (!variant) return false;
  const locationGid = `gid://shopify/Location/${payload.location_id}`;
  const available = payload.available ?? 0;
  await prisma.inventoryLevel.upsert({
    where: { variantId_locationGid: { variantId: variant.id, locationGid } },
    create: { storeId, variantId: variant.id, locationGid, available },
    update: { available },
  });
  return true;
}
