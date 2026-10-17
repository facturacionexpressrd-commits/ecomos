import type { MessageKey, Vars } from "@/lib/i18n";

/** El paso lleva claves, no texto: la traducción ocurre donde se renderiza. */
export type SetupStep = {
  key: string;
  labelKey: MessageKey;
  hintKey: MessageKey;
  hintVars?: Vars;
  href: string;
  done: boolean;
};

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
      labelKey: "setup.store.label",
      hintKey: "setup.store.hint",
      href: `/dashboard/stores${q}`,
      done: true,
    },
    {
      key: "sync",
      labelKey: "setup.sync.label",
      hintKey: "setup.sync.hint",
      href: `/dashboard/products${q}`,
      done: input.productCount > 0,
    },
    {
      key: "costs",
      labelKey: "setup.costs.label",
      hintKey: input.variantsMissingCost > 0 ? "setup.costs.hintMissing" : "setup.costs.hint",
      hintVars:
        input.variantsMissingCost > 0
          ? { missing: input.variantsMissingCost, total: input.variantCount }
          : undefined,
      href: `/dashboard/products${q}`,
      done: input.variantCount > 0 && input.variantsMissingCost === 0,
    },
    {
      key: "meta",
      labelKey: "setup.meta.label",
      hintKey: "setup.meta.hint",
      href: `/dashboard/integrations${q}`,
      done: input.metaConnected,
    },
  ];
  if (input.billingEnabled) {
    steps.push({
      key: "billing",
      labelKey: "setup.billing.label",
      hintKey: "setup.billing.hint",
      href: "/billing",
      done: input.subscribed,
    });
  }
  return steps;
}
