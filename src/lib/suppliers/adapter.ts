/**
 * SupplierAdapter interface — every supplier implements this.
 * Methods return null on "not connected" or error, not exceptions.
 */

export interface SupplierProductOffer {
  supplierProductId: string;
  cost: number;
  shippingCost: number;
  shippingDays: number;
  availableQty: number;
}

export interface SupplierCapabilities {
  search: boolean;
  getProduct: boolean;
  getPricing: boolean;
  checkInventory: boolean;
  estimateDelivery: boolean;
}

export abstract class SupplierAdapter {
  abstract name: string;
  abstract authenticate(): Promise<boolean>;
  abstract healthCheck(): Promise<boolean>;
  abstract getCapabilities(): SupplierCapabilities;

  /**
   * Search by external ID (SKU, barcode, EAN, etc).
   * Returns null if not found or adapter doesn't support search.
   */
  abstract searchProduct(externalId: string): Promise<SupplierProductOffer | null>;

  /**
   * Get product by supplier's own ID.
   * Returns null if not found or adapter doesn't support it.
   */
  abstract getProduct(supplierProductId: string): Promise<SupplierProductOffer | null>;
}
