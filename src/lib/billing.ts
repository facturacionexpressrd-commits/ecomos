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

// API routes a lapsed workspace can still call: paying (billing), data flowing in from Shopify
// (webhooks, compliance, connect), jobs, getting started, and deleting its own data.
const API_EXEMPT = [
  "/api/billing",
  "/api/shopify",
  "/api/cron",
  "/api/health",
  "/api/onboarding",
  "/api/invitations/accept",
  "/api/workspace/delete",
  "/api/meta/auth",
];

/** Whether a request path is an API route that needs an active subscription. */
export function apiRequiresSubscription(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  return !API_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** A signed-in user's workspace can use paid features. Users without a workspace yet (onboarding) pass. */
export async function userHasAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organization: { select: { subscriptionStatus: true } } },
  });
  return !user || hasAccess(user.organization.subscriptionStatus);
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
