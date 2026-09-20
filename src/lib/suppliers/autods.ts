import { SupplierAdapter, SupplierCapabilities, SupplierProductOffer } from "./adapter";

/**
 * AutoDS adapter — pulls cost, shipping, inventory from AutoDS API.
 * Today: stub with mock data (API calls come when you provide API key + docs).
 */
export class AutoDSAdapter extends SupplierAdapter {
  name = "autods";
  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey ?? null;
  }

  async authenticate(): Promise<boolean> {
    // TODO: call AutoDS /auth endpoint when API docs are provided
    if (!this.apiKey) return false;
    try {
      // Mock: assume API key format is valid
      return this.apiKey.length > 0;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    // TODO: call AutoDS /health or similar when API docs are provided
    if (!this.apiKey) return false;
    try {
      // Mock: assume connected
      return true;
    } catch {
      return false;
    }
  }

  getCapabilities(): SupplierCapabilities {
    return {
      search: true,
      getProduct: true,
      getPricing: true,
      checkInventory: true,
      estimateDelivery: true,
    };
  }

  async searchProduct(
    externalId: string
  ): Promise<SupplierProductOffer | null> {
    if (!this.apiKey) return null;

    try {
      // TODO: POST to AutoDS /products/search endpoint
      // For now, return mock data to test the flow
      return {
        supplierProductId: `autods-${externalId}`,
        cost: 5.99,
        shippingCost: 2.5,
        shippingDays: 7,
        availableQty: 100,
      };
    } catch {
      return null;
    }
  }

  async getProduct(supplierProductId: string): Promise<SupplierProductOffer | null> {
    if (!this.apiKey) return null;

    try {
      // TODO: GET /products/{id} endpoint
      // For now, return mock data
      return {
        supplierProductId,
        cost: 5.99,
        shippingCost: 2.5,
        shippingDays: 7,
        availableQty: 100,
      };
    } catch {
      return null;
    }
  }
}
