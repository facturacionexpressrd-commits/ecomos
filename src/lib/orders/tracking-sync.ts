import { PrismaClient } from "@prisma/client";
import { supplierRegistry } from "@/lib/suppliers/registry";

export async function syncTrackingEvents(prisma: PrismaClient): Promise<number> {
  // Find all open fulfillments with shipments
  const fulfillments = await prisma.fulfillment.findMany({
    where: {
      shipment: {
        actualDelivery: null,
      },
      supplierOrder: {
        status: {
          notIn: ["cancelled", "delivered"],
        },
      },
    },
    include: {
      shipment: true,
      supplierOrder: true,
    },
  });

  let synced = 0;

  for (const fulfillment of fulfillments) {
    const shipment = fulfillment.shipment;
    if (!shipment) continue;

    // Get adapter for supplier
    const adapter = await supplierRegistry.getConnected(fulfillment.supplierOrder.supplier);
    if (!adapter) continue;

    try {
      // Mock: simulate tracking update
      // In production, this would call adapter.getTracking(shipment.trackingNumber)
      if (shipment.trackingNumber?.startsWith("autods-")) {
        const status = ["in_transit", "out_for_delivery", "delivered"][Math.floor(Math.random() * 3)];

        // Create tracking event
        await prisma.trackingEvent.create({
          data: {
            shipmentId: shipment.id,
            status,
            message: `Package is ${status === "delivered" ? "delivered" : status === "out_for_delivery" ? "out for delivery" : "in transit"}`,
            timestamp: new Date(),
          },
        });

        // Update fulfillment status
        await prisma.fulfillment.update({
          where: { id: fulfillment.id },
          data: {
            status:
              status === "delivered"
                ? "delivered"
                : status === "out_for_delivery"
                  ? "shipped"
                  : "processing",
          },
        });

        // If delivered, update shipment and supplier order
        if (status === "delivered") {
          await prisma.shipment.update({
            where: { id: shipment.id },
            data: { actualDelivery: new Date() },
          });

          await prisma.supplierOrder.update({
            where: { id: fulfillment.supplierOrderId },
            data: { status: "delivered" },
          });
        }

        synced++;
      }
    } catch (error) {
      console.error(`Failed to sync tracking for fulfillment ${fulfillment.id}:`, error);
    }
  }

  return synced;
}
