import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { shopifyGraphQL } from "@/lib/shopify/client";
import { reportError } from "@/lib/alerts";
import * as cj from "@/lib/suppliers/cj";

// ponytail: link-time shipping quotes assume US customers. Real orders are quoted to their actual
// address at send time; add a per-store "main market" setting if non-US stores see wrong estimates.
const DEFAULT_SHIP_TO = "US";
const DAY = 86_400_000;

export class CjUserError extends Error {}

// ---------- connection ----------

/** Verifies the key with CJ before saving it, so a typo fails here instead of on the first order. */
export async function connectCj(organizationId: string, apiKey: string) {
  const key = apiKey.trim();
  if (!key) throw new CjUserError("Paste your CJ API key.");
  let token;
  try {
    token = await cj.getAccessToken(key);
  } catch (err) {
    if (err instanceof cj.CjError) throw new CjUserError(`CJ rejected that API key: ${err.message}`);
    throw err;
  }
  const data = {
    apiKeyEncrypted: encryptSecret(key),
    accessTokenEncrypted: encryptSecret(token.accessToken),
    accessTokenExpiresAt: token.expiresAt,
  };
  await prisma.supplierConnection.upsert({
    where: { organizationId_supplier: { organizationId, supplier: "cj" } },
    create: { organizationId, supplier: "cj", ...data },
    update: { ...data, connectedAt: new Date() },
  });
}

export async function disconnectCj(organizationId: string) {
  await prisma.supplierConnection.deleteMany({ where: { organizationId, supplier: "cj" } });
}

/** A valid access token for the workspace, re-issued from the stored API key when within a day of expiry. */
export async function cjToken(organizationId: string): Promise<string> {
  const conn = await prisma.supplierConnection.findUnique({
    where: { organizationId_supplier: { organizationId, supplier: "cj" } },
  });
  if (!conn) throw new CjUserError("Connect CJ Dropshipping on the Integrations page first.");
  if (conn.accessTokenEncrypted && conn.accessTokenExpiresAt && conn.accessTokenExpiresAt.getTime() - Date.now() > DAY) {
    return decryptSecret(conn.accessTokenEncrypted);
  }
  const fresh = await cj.getAccessToken(decryptSecret(conn.apiKeyEncrypted));
  await prisma.supplierConnection.update({
    where: { id: conn.id },
    data: { accessTokenEncrypted: encryptSecret(fresh.accessToken), accessTokenExpiresAt: fresh.expiresAt },
  });
  return fresh.accessToken;
}

// ---------- product links ----------

// Rounded to cents so it compares equal to the Decimal(12,2) it's stored as (3.10 + 4.71 !== 7.81 in floats).
const landed = (link: { cost: Prisma.Decimal | number | null; shippingCost: Prisma.Decimal | number | null }) =>
  link.cost == null ? null : Math.round((Number(link.cost) + Number(link.shippingCost ?? 0)) * 100) / 100;

async function fetchLinkFields(token: string, vid: string) {
  const [stock, variant] = await Promise.all([cj.getStock(token, vid), cj.findVariant(token, vid)]);
  if (!variant) throw new CjUserError("CJ no longer lists this variant.");
  const from = cj.pickOrigin(stock, DEFAULT_SHIP_TO);
  const freight = cj.cheapest(await cj.quoteFreight(token, from, DEFAULT_SHIP_TO, [{ vid, quantity: 1 }]));
  return {
    supplierVariantId: variant.vid,
    supplierSku: variant.sku,
    supplierName: variant.name,
    cost: variant.price,
    shippingCost: freight?.price ?? null,
    shippingMethod: freight?.method ?? null,
    shippingDays: freight?.days ?? null,
    fromCountryCode: from,
    availableQty: stock.reduce((s, x) => s + x.qty, 0),
    lastSyncedAt: new Date(),
    syncError: null,
  };
}

/**
 * Links a Shopify variant to a CJ variant (by CJ variant ID or SKU) and sets the variant's cost to
 * CJ's landed cost (unit price + cheapest shipping), so profit figures use the real supplier cost.
 */
export async function linkVariant(input: { storeId: string; variantId: string; ref: string; userId: string }) {
  const variant = await prisma.productVariant.findFirst({
    where: { id: input.variantId, storeId: input.storeId },
    include: { store: { select: { organizationId: true } } },
  });
  if (!variant) throw new CjUserError("Variant not found.");
  const token = await cjToken(variant.store.organizationId);

  let match;
  try {
    match = await cj.findVariant(token, input.ref);
  } catch (err) {
    if (err instanceof cj.CjError) throw new CjUserError(`CJ refused the request: ${err.message}. Try reconnecting CJ.`);
    throw err;
  }
  if (!match) throw new CjUserError(`No CJ variant matches "${input.ref.trim()}". Use the CJ variant SKU or variant ID.`);

  const fields = await fetchLinkFields(token, match.vid);
  const link = await prisma.supplierLink.upsert({
    where: { variantId_supplier: { variantId: variant.id, supplier: "cj" } },
    create: { storeId: input.storeId, variantId: variant.id, supplier: "cj", ...fields },
    update: fields,
  });
  await prisma.productVariant.update({ where: { id: variant.id }, data: { cost: landed(link) } });
  await prisma.auditLog.create({
    data: {
      organizationId: variant.store.organizationId,
      userId: input.userId,
      storeId: input.storeId,
      action: "supplier_link_created",
      metadata: { supplier: "cj", variantId: variant.id, vid: link.supplierVariantId, cost: landed(link) },
    },
  });
  return link;
}

export async function unlinkVariant(storeId: string, variantId: string) {
  await prisma.supplierLink.deleteMany({ where: { storeId, variantId, supplier: "cj" } });
}

/**
 * Nightly: refresh every CJ link's price, shipping and stock. The variant's cost follows only if it
 * still equals the old CJ landed cost, so a cost the merchant typed in by hand is never overwritten.
 */
export async function refreshAllCjLinks() {
  const links = await prisma.supplierLink.findMany({
    where: { supplier: "cj" },
    include: { variant: { select: { cost: true } }, store: { select: { organizationId: true } } },
  });
  const tokens = new Map<string, string>();
  let refreshed = 0;
  let failed = 0;
  for (const link of links) {
    try {
      const org = link.store.organizationId;
      if (!tokens.has(org)) tokens.set(org, await cjToken(org));
      const fields = await fetchLinkFields(tokens.get(org)!, link.supplierVariantId);
      const before = landed(link);
      const updated = await prisma.supplierLink.update({ where: { id: link.id }, data: fields });
      const current = link.variant.cost == null ? null : Number(link.variant.cost);
      if (current === before) {
        await prisma.productVariant.update({ where: { id: link.variantId }, data: { cost: landed(updated) } });
      }
      refreshed++;
    } catch (err) {
      failed++;
      const message = err instanceof Error ? err.message : String(err);
      await prisma.supplierLink.update({ where: { id: link.id }, data: { syncError: message.slice(0, 500) } });
    }
  }
  return { refreshed, failed };
}

// ---------- orders ----------

const ADDRESS_QUERY = /* GraphQL */ `
  query OrderAddress($id: ID!) {
    order(id: $id) {
      email
      shippingAddress {
        name
        address1
        address2
        city
        province
        country
        countryCodeV2
        zip
        phone
      }
    }
  }
`;

type AddressResponse = {
  order: {
    email: string | null;
    shippingAddress: {
      name: string | null;
      address1: string | null;
      address2: string | null;
      city: string | null;
      province: string | null;
      country: string | null;
      countryCodeV2: string | null;
      zip: string | null;
      phone: string | null;
    } | null;
  } | null;
};

/**
 * Creates the order at CJ for every line whose variant is linked to CJ. The CJ order is created
 * UNPAID: the merchant confirms and pays it in their CJ account. Safe to double-click: the
 * SupplierOrder row is claimed first (unique per order+supplier), so a second click can't create a
 * second CJ order.
 */
export async function sendOrderToCj(input: { storeId: string; orderId: string; userId: string }) {
  const order = await prisma.order.findFirst({
    where: { id: input.orderId, storeId: input.storeId },
    include: {
      store: true,
      lineItems: { include: { variant: { include: { supplierLinks: { where: { supplier: "cj" } } } } } },
    },
  });
  if (!order) throw new CjUserError("Order not found.");

  const lines = order.lineItems
    .map((li) => ({ li, link: li.variant?.supplierLinks[0] }))
    .filter((x): x is { li: (typeof order.lineItems)[number]; link: NonNullable<typeof x.link> } => !!x.link);
  if (lines.length === 0) {
    throw new CjUserError("None of this order's products are linked to CJ. Link them on each product's page first.");
  }

  const token = await cjToken(order.store.organizationId);
  if (!order.store.accessTokenEncrypted) throw new CjUserError("This store's Shopify connection is missing.");

  let address: AddressResponse["order"];
  try {
    const data = await shopifyGraphQL<AddressResponse>(
      order.store.shopDomain,
      decryptSecret(order.store.accessTokenEncrypted),
      ADDRESS_QUERY,
      { id: order.shopifyGid }
    );
    address = data.order;
  } catch (err) {
    await reportError(err, { where: "sendOrderToCj: shipping address" });
    throw new CjUserError(
      "Couldn't read this order's shipping address from Shopify. The Shopify app may need protected customer data access."
    );
  }
  const ship = address?.shippingAddress;
  if (!ship?.address1 || !ship.city || !ship.countryCodeV2 || !ship.name) {
    throw new CjUserError("This order has no complete shipping address in Shopify.");
  }

  const products = lines.map(({ li, link }) => ({ vid: link.supplierVariantId, quantity: li.quantity }));
  // Items ship together, so quote the whole parcel from the warehouse most of them ship from.
  const from = lines[0].link.fromCountryCode ?? "CN";
  const freight = cj.cheapest(await cj.quoteFreight(token, from, ship.countryCodeV2, products));
  if (!freight) throw new CjUserError(`CJ has no shipping method from ${from} to ${ship.countryCodeV2} for these items.`);

  const totalCost = lines.reduce((s, { li, link }) => s + Number(link.cost ?? 0) * li.quantity, 0);
  const revenue = lines.reduce((s, { li }) => s + Number(li.netAmount), 0);
  const fees = revenue * (Number(order.store.paymentFeePercent) / 100) + Number(order.store.paymentFeeFixed);

  let supplierOrder;
  try {
    supplierOrder = await prisma.supplierOrder.create({
      data: {
        storeId: order.storeId,
        orderId: order.id,
        supplier: "cj",
        status: "submitting",
        totalCost,
        totalShipping: freight.price,
        estimatedMargin: revenue - totalCost - freight.price - fees,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new CjUserError("This order was already sent to CJ.");
    }
    throw err;
  }

  let cjOrder;
  try {
    cjOrder = await cj.createOrder(token, {
      orderNumber: `${order.name}-${order.id.slice(-6)}`.slice(0, 50),
      shippingCountryCode: ship.countryCodeV2,
      shippingCountry: ship.country ?? ship.countryCodeV2,
      shippingProvince: ship.province ?? "",
      shippingCity: ship.city,
      shippingAddress: ship.address1,
      shippingAddress2: ship.address2 ?? undefined,
      shippingZip: ship.zip ?? undefined,
      shippingPhone: ship.phone ?? undefined,
      shippingCustomerName: ship.name,
      email: address?.email ?? undefined,
      logisticName: freight.method,
      fromCountryCode: from,
      products,
    });
  } catch (err) {
    // Nothing was created at CJ, so release the claim and let them retry.
    await prisma.supplierOrder.delete({ where: { id: supplierOrder.id } });
    if (err instanceof cj.CjError) throw new CjUserError(`CJ refused the order: ${err.message}`);
    throw err;
  }

  await prisma.$transaction([
    prisma.supplierOrder.update({
      where: { id: supplierOrder.id },
      data: { supplierOrderId: cjOrder.orderId, status: "awaiting_payment", submittedAt: new Date() },
    }),
    prisma.fulfillment.create({ data: { supplierOrderId: supplierOrder.id, status: "pending" } }),
    prisma.auditLog.create({
      data: {
        organizationId: order.store.organizationId,
        userId: input.userId,
        storeId: order.storeId,
        action: "supplier_order_created",
        metadata: { supplier: "cj", orderId: order.id, cjOrderId: cjOrder.orderId, items: products.length },
      },
    }),
  ]);
  return { cjOrderId: cjOrder.orderId, skipped: order.lineItems.length - lines.length };
}

const FULFILLMENT_STATUS: Record<string, string> = {
  awaiting_payment: "pending",
  processing: "processing",
  shipped: "shipped",
  delivered: "delivered",
  cancelled: "failed",
};

/** Nightly: pull status, real charged amounts and tracking for every open CJ order. */
export async function syncCjOrders() {
  const open = await prisma.supplierOrder.findMany({
    where: { supplier: "cj", supplierOrderId: { not: null }, status: { notIn: ["delivered", "cancelled"] } },
    include: { store: { select: { organizationId: true } }, fulfillments: { include: { shipment: true } } },
  });
  const tokens = new Map<string, string>();
  let synced = 0;
  let failed = 0;
  for (const so of open) {
    try {
      const org = so.store.organizationId;
      if (!tokens.has(org)) tokens.set(org, await cjToken(org));
      const detail = await cj.getOrderDetail(tokens.get(org)!, so.supplierOrderId!);
      const status = cj.mapOrderStatus(detail.orderStatus);

      await prisma.supplierOrder.update({
        where: { id: so.id },
        data: {
          status,
          ...(detail.productAmount != null ? { totalCost: detail.productAmount } : {}),
          ...(detail.postageAmount != null ? { totalShipping: detail.postageAmount } : {}),
        },
      });

      const fulfillment = so.fulfillments[0];
      if (fulfillment) {
        let shipmentId = fulfillment.shipmentId;
        if (detail.trackNumber && !shipmentId) {
          const shipment = await prisma.shipment.create({
            data: { trackingNumber: detail.trackNumber, carrier: detail.logisticName },
          });
          shipmentId = shipment.id;
        } else if (detail.trackNumber && fulfillment.shipment?.trackingNumber !== detail.trackNumber) {
          await prisma.shipment.update({
            where: { id: shipmentId! },
            data: { trackingNumber: detail.trackNumber, carrier: detail.logisticName },
          });
        }
        await prisma.fulfillment.update({
          where: { id: fulfillment.id },
          data: { status: FULFILLMENT_STATUS[status] ?? "processing", shipmentId },
        });
        // One tracking event per status change, straight from CJ's own order status.
        if (shipmentId && status !== so.status) {
          await prisma.trackingEvent.create({
            data: { shipmentId, status, message: `CJ order status: ${detail.orderStatus}`, timestamp: new Date() },
          });
          if (status === "delivered") {
            await prisma.shipment.update({ where: { id: shipmentId }, data: { actualDelivery: new Date() } });
          }
        }
      }
      synced++;
    } catch (err) {
      failed++;
      await reportError(err, { where: "syncCjOrders", supplierOrderId: so.id });
    }
  }
  return { synced, failed };
}
