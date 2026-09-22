import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { hasAccess, subscriptionFields } from "../src/lib/billing";
import { redact } from "../src/lib/alerts";

describe("hasAccess", () => {
  it("lets paying, trialing, retrying and comped workspaces in", () => {
    for (const s of ["active", "trialing", "past_due", "comped"]) expect(hasAccess(s)).toBe(true);
  });
  it("keeps everyone else out, including workspaces that never subscribed", () => {
    for (const s of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused", null, undefined]) {
      expect(hasAccess(s)).toBe(false);
    }
  });
});

describe("subscriptionFields", () => {
  const sub = (status: Stripe.Subscription.Status, periodEnd?: number) =>
    ({ status, items: { data: periodEnd ? [{ current_period_end: periodEnd }] : [] } }) as unknown as Stripe.Subscription;

  it("reads the renewal date off the subscription item", () => {
    expect(subscriptionFields(sub("active", 1_800_000_000))).toEqual({
      subscriptionStatus: "active",
      currentPeriodEnd: new Date(1_800_000_000 * 1000),
    });
  });
  it("tolerates a subscription with no items", () => {
    expect(subscriptionFields(sub("canceled")).currentPeriodEnd).toBeNull();
  });
});

describe("redact (Stripe)", () => {
  it("removes Stripe secret keys and webhook secrets", () => {
    expect(redact("Invalid API Key provided: sk_live_51Abcdefghijklmnop")).not.toContain("sk_live_51Abcdefghijklmnop");
    expect(redact("whsec_abcdefghijklmnopqrst")).toBe("[redacted]");
  });
});
