export type SetupStep = { key: string; label: string; hint: string; href: string; done: boolean };

/**
 * The first-run checklist on Overview, derived from data the workspace already has — no flags to
 * keep in sync. Billing only appears once Stripe is configured, so it can't block a free deploy.
 */
export function setupSteps(input: {
  storeId: string;
  productCount: number;
  variantCount: number;
  variantsMissingCost: number;
  metaConnected: boolean;
  billingEnabled: boolean;
  subscribed: boolean;
}): SetupStep[] {
  const q = `?store=${input.storeId}`;
  const steps: SetupStep[] = [
    {
      key: "store",
      label: "Connect your Shopify store",
      hint: "Products, orders and inventory flow in automatically.",
      href: `/dashboard/stores${q}`,
      done: true,
    },
    {
      key: "sync",
      label: "Finish the first sync",
      hint: "Your catalog is still importing. This page fills in as it lands.",
      href: `/dashboard/products${q}`,
      done: input.productCount > 0,
    },
    {
      key: "costs",
      label: "Enter product costs",
      hint:
        input.variantsMissingCost > 0
          ? `${input.variantsMissingCost} of ${input.variantCount} variants have no cost, so their profit is unknown.`
          : "Enter a cost or link CJ on each variant so profit is real.",
      href: `/dashboard/products${q}`,
      done: input.variantCount > 0 && input.variantsMissingCost === 0,
    },
    {
      key: "meta",
      label: "Connect Meta Ads",
      hint: "Brings in ad spend so you see ROAS and true profit.",
      href: `/dashboard/integrations${q}`,
      done: input.metaConnected,
    },
  ];
  if (input.billingEnabled) {
    steps.push({
      key: "billing",
      label: "Choose a plan",
      hint: "Keep access after your trial.",
      href: "/billing",
      done: input.subscribed,
    });
  }
  return steps;
}
