import { PrismaClient } from "@prisma/client";
import { SupplierAdapter } from "./adapter";
import { AutoDSAdapter } from "./autods";

export type SupplierNameType = "autods" | "spocket" | "printful" | "zendrop";

/**
 * SupplierRegistry — wires up all supplier adapters.
 * Adapters can be real (connected) or stub (not connected).
 */
export class SupplierRegistry {
  private adapters: Map<SupplierNameType, SupplierAdapter> = new Map();

  constructor() {
    // Initialize adapters
    // Only AutoDS is connected; others are stubbed (see below)
    const autoDsKey = process.env.AUTODS_API_KEY ?? null;
    this.adapters.set("autods", new AutoDSAdapter(autoDsKey ?? undefined));

    // TODO: stub adapters for Spocket, Printful, Zendrop
    // For now, skip them
  }

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
