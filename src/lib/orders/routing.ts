import { PrismaClient } from "@prisma/client";

interface RoutingDecision {
  lineItemId: string;
  supplierOfferId: string;
  cost: number;
  shippingCost: number;
  shippingDays: number;
}

export async function routeOrderLineItems(
  orderId: string,
  prisma: PrismaClient
): Promise<RoutingDecision[]> {
  // Fetch order first to get storeId
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
  });

  // Fetch line items with product mappings to canonical products
  const lineItems = await prisma.orderLineItem.findMany({
    where: { orderId },
    include: {
      variant: {
        include: {
          product: true,
        },
      },
    },
  });

  const decisions: RoutingDecision[] = [];

  // For each line item, find its product mapping and supplier offers
  for (const li of lineItems) {
    if (!li.variant) continue;

    const mapping = await prisma.productMapping.findFirst({
      where: { storeId: order.storeId, shopifyProductId: li.variant.productId },
    });

    if (!mapping) continue;

    const offers = await prisma.supplierOffer.findMany({
      where: { canonicalProductId: mapping.canonicalProductId, syncStatus: "success" },
    });

    if (offers.length === 0) continue;

    // Pick cheapest available supplier
    const bestOffer = offers.reduce((best: typeof offers[0], offer) => {
      const bestCost = Number(best.cost) + Number(best.shippingCost);
      const offerCost = Number(offer.cost) + Number(offer.shippingCost);
      return offerCost < bestCost ? offer : best;
    });

    decisions.push({
      lineItemId: li.id,
      supplierOfferId: bestOffer.id,
      cost: Number(bestOffer.cost),
      shippingCost: Number(bestOffer.shippingCost),
      shippingDays: bestOffer.shippingDays,
    });
  }

  // Persist routing decisions
  for (const decision of decisions) {
    await prisma.orderRoute.upsert({
      where: { lineItemId: decision.lineItemId },
      create: {
        storeId: order.storeId,
        orderId,
        lineItemId: decision.lineItemId,
        supplierOfferId: decision.supplierOfferId,
        reason: "auto-routed: cheapest supplier",
      },
      update: {
        supplierOfferId: decision.supplierOfferId,
      },
    });
  }

  return decisions;
}

export async function createSupplierOrdersFromRoutes(
  orderId: string,
  prisma: PrismaClient
): Promise<void> {
  // Group routes by supplier
  const routes = await prisma.orderRoute.findMany({
    where: { orderId },
    include: {
      supplierOffer: {
        include: {
          canonicalProduct: true,
        },
      },
    },
  });

  type SupplierType = "autods" | "spocket" | "printful" | "zendrop";
  const bySupplier = new Map<SupplierType, typeof routes>();

  for (const route of routes) {
    const key = route.supplierOffer.supplier as SupplierType;
    if (!bySupplier.has(key)) bySupplier.set(key, []);
    bySupplier.get(key)!.push(route);
  }

  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const store = await prisma.store.findUniqueOrThrow({ where: { id: order.storeId } });

  // Create one SupplierOrder per supplier
  for (const [supplier, supplierRoutes] of bySupplier) {
    const totalCost = supplierRoutes.reduce((sum, r) => sum + Number(r.supplierOffer.cost), 0);
    const totalShipping = supplierRoutes.reduce((sum, r) => sum + Number(r.supplierOffer.shippingCost), 0);
    const totalRevenue = Number(order.totalPrice);

    // Estimate margin (simplified: (Revenue - Cost - Shipping - PaymentFees) / Revenue)
    const paymentFees = totalRevenue * (Number(store.paymentFeePercent) / 100) + Number(store.paymentFeeFixed);
    const estimatedMargin = totalRevenue - (totalCost + totalShipping + paymentFees);

    const supplierOrder = await prisma.supplierOrder.upsert({
      where: { orderId_supplier: { orderId, supplier } },
      create: {
        orderId,
        storeId: order.storeId,
        supplier,
        totalCost,
        totalShipping,
        estimatedMargin,
      },
      update: {
        totalCost,
        totalShipping,
        estimatedMargin,
      },
    });

    // Create a fulfillment record
    await prisma.fulfillment.upsert({
      where: { supplierOrderId: supplierOrder.id },
      create: {
        supplierOrderId: supplierOrder.id,
      },
      update: {},
    });
  }
}
