import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST } from "../src/app/api/billing/webhook/route";

/**
 * Route contract test: the webhook must reject anything missing a Stripe signature or
 * without STRIPE_WEBHOOK_SECRET set. Signature verification itself is Stripe SDK work
 * and doesn't need a test here.
 */
describe("POST /api/billing/webhook", () => {
  const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  afterEach(() => {
    if (originalSecret) process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  });

  it("returns 400 when webhook secret is not configured", async () => {
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=deadbeef" },
      body: "{}",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });

  it("returns 400 when Stripe signature header is missing", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    const req = new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body: "{}",
    });
    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});
