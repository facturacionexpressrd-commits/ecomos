import Stripe from "stripe";
import { prisma } from "@/lib/db";

// "past_due" keeps access while Stripe retries the card, so one failed charge doesn't lock a
// paying customer out; Stripe moves it to "unpaid"/"canceled" if the retries all fail.
const ACCESS_STATUSES = new Set(["active", "trialing", "past_due", "comped"]);

/** Billing is off until the Stripe keys exist, so deploying this changes nothing until it's configured. */
export function billingEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

export function hasAccess(status: string | null | undefined): boolean {
  return status != null && ACCESS_STATUSES.has(status);
}

let client: Stripe | null = null;
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  client ??= new Stripe(key);
  return client;
}

/** What the org row should hold for a subscription. The renewal date lives on the item in current Stripe API versions. */
export function subscriptionFields(sub: Pick<Stripe.Subscription, "status" | "items">) {
  const periodEnd = sub.items.data[0]?.current_period_end;
  return {
    subscriptionStatus: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
  };
}

/** Mirrors a subscription onto its org, found by the Stripe customer we stored at checkout. */
export async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await prisma.organization.updateMany({
    where: { stripeCustomerId: customerId, NOT: { subscriptionStatus: "comped" } },
    data: subscriptionFields(sub),
  });
}

/** Returns the org's Stripe customer, creating it on first checkout. */
export async function ensureCustomer(org: { id: string; name: string; stripeCustomerId: string | null }, email: string) {
  if (org.stripeCustomerId) return org.stripeCustomerId;
  const customer = await stripe().customers.create({ name: org.name, email, metadata: { organizationId: org.id } });
  await prisma.organization.update({ where: { id: org.id }, data: { stripeCustomerId: customer.id } });
  return customer.id;
}
