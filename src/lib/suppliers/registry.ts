import { PrismaClient } from "@prisma/client";
import { SupplierAdapter } from "./adapter";

export type SupplierNameType = "autods" | "spocket" | "printful" | "zendrop";

/**
 * SupplierRegistry — wires up all supplier adapters.
 * Empty until a real supplier adapter exists: an earlier AutoDS adapter always returned
 * fabricated costs/inventory, which was worse than no integration since it looked real.
 * `syncOffer` below already no-ops safely when a name has no registered adapter.
 */
export class SupplierRegistry {
  private adapters: Map<SupplierNameType, SupplierAdapter> = new Map();

  get(name: SupplierNameType): SupplierAdapter | null {
    return this.adapters.get(name) ?? null;
  }

  async getConnected(name: SupplierNameType): Promise<SupplierAdapter | null> {
    const adapter = this.get(name);
    if (!adapter) return null;
    const isHealthy = await adapter.healthCheck();
    return isHealthy ? adapter : null;
  }

  async syncOffer(
    canonicalProductId: string,
    name: SupplierNameType,
    prisma: PrismaClient
  ): Promise<void> {
    const adapter = await this.getConnected(name);
    if (!adapter) {
      // Not connected; don't update
      return;
    }

    // Get CanonicalProduct to find external ID
    const product = await prisma.canonicalProduct.findUnique({
      where: { id: canonicalProductId },
    });
    if (!product) return;

    // Try to find the product by SKU, barcode, etc.
    let offer = null;
    if (product.sku) offer = await adapter.searchProduct(product.sku);
    if (!offer && product.barcode) offer = await adapter.searchProduct(product.barcode);
    if (!offer && product.externalId) offer = await adapter.searchProduct(product.externalId);

    if (!offer) {
      // Product not found on supplier; mark as "not available"
      await prisma.supplierOffer.upsert({
        where: {
          canonicalProductId_supplier: { canonicalProductId, supplier: name },
        },
        create: {
          canonicalProductId,
          supplier: name,
          cost: 0,
          shippingCost: 0,
          shippingDays: 999,
          availableQty: 0,
          syncStatus: "not_found",
        },
        update: {
          cost: 0,
          shippingCost: 0,
          shippingDays: 999,
          availableQty: 0,
          syncStatus: "not_found",
          lastSyncedAt: new Date(),
        },
      });
      return;
    }

    // Found; upsert the offer
    await prisma.supplierOffer.upsert({
      where: {
        canonicalProductId_supplier: { canonicalProductId, supplier: name },
      },
      create: {
        canonicalProductId,
        supplier: name,
        supplierProductId: offer.supplierProductId,
        cost: offer.cost,
        shippingCost: offer.shippingCost,
        shippingDays: offer.shippingDays,
        availableQty: offer.availableQty,
        syncStatus: "success",
        lastSyncedAt: new Date(),
      },
      update: {
        supplierProductId: offer.supplierProductId,
        cost: offer.cost,
        shippingCost: offer.shippingCost,
        shippingDays: offer.shippingDays,
        availableQty: offer.availableQty,
        syncStatus: "success",
        lastSyncedAt: new Date(),
      },
    });
  }
}

export const supplierRegistry = new SupplierRegistry();
