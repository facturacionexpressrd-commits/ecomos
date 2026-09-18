import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { shopifyGraphQL } from "@/lib/shopify/client";

type PageInfo = { hasNextPage: boolean; endCursor: string | null };

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($cursor: String) {
    products(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        title
        status
        variants(first: 100) {
          nodes {
            id
            sku
            title
            price
            inventoryItem {
              inventoryLevels(first: 10) {
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
  query Customers($cursor: String) {
    customers(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes { id email displayName }
    }
  }
`;

const ORDERS_QUERY = /* GraphQL */ `
  query Orders($cursor: String) {
    orders(first: 50, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id
        name
        createdAt
        displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        customer { id }
      }
    }
  }
`;

type ProductsResponse = {
  products: {
    pageInfo: PageInfo;
    nodes: Array<{
      id: string;
      title: string;
      status: string;
      variants: {
        nodes: Array<{
          id: string;
          sku: string | null;
          title: string | null;
          price: string;
          inventoryItem: {
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
    nodes: Array<{ id: string; email: string | null; displayName: string | null }>;
  };
};

type OrdersResponse = {
  orders: {
    pageInfo: PageInfo;
    nodes: Array<{
      id: string;
      name: string;
      createdAt: string;
      displayFinancialStatus: string | null;
      currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
      customer: { id: string } | null;
    }>;
  };
};

async function getStoreCredentials(storeId: string) {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
  if (!store.accessTokenEncrypted) {
    throw new Error(`Store ${storeId} has no access token — connect it first`);
  }
  return { shop: store.shopDomain, accessToken: decryptSecret(store.accessTokenEncrypted) };
}

async function syncCustomers(storeId: string, shop: string, accessToken: string) {
  let cursor: string | null = null;
  do {
    const data: CustomersResponse = await shopifyGraphQL(shop, accessToken, CUSTOMERS_QUERY, { cursor });
    for (const c of data.customers.nodes) {
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
    cursor = data.customers.pageInfo.hasNextPage ? data.customers.pageInfo.endCursor : null;
  } while (cursor);
}

async function syncProducts(storeId: string, shop: string, accessToken: string) {
  let cursor: string | null = null;
  do {
    const data: ProductsResponse = await shopifyGraphQL(shop, accessToken, PRODUCTS_QUERY, { cursor });
    for (const p of data.products.nodes) {
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
            sku: v.sku,
            title: v.title,
            price: v.price,
            raw: v as object,
          },
          update: { sku: v.sku, title: v.title, price: v.price, raw: v as object },
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
    cursor = data.products.pageInfo.hasNextPage ? data.products.pageInfo.endCursor : null;
  } while (cursor);
}

async function syncOrders(storeId: string, shop: string, accessToken: string) {
  let cursor: string | null = null;
  do {
    const data: OrdersResponse = await shopifyGraphQL(shop, accessToken, ORDERS_QUERY, { cursor });
    for (const o of data.orders.nodes) {
      const customer = o.customer
        ? await prisma.customer.findUnique({
            where: { storeId_shopifyGid: { storeId, shopifyGid: o.customer.id } },
          })
        : null;

      await prisma.order.upsert({
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
    }
    cursor = data.orders.pageInfo.hasNextPage ? data.orders.pageInfo.endCursor : null;
  } while (cursor);
}

/** Full sync: customers first (orders reference them), then products+inventory, then orders. */
export async function syncStore(storeId: string): Promise<void> {
  const { shop, accessToken } = await getStoreCredentials(storeId);
  await syncCustomers(storeId, shop, accessToken);
  await syncProducts(storeId, shop, accessToken);
  await syncOrders(storeId, shop, accessToken);
}
