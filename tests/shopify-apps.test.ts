import { describe, it, expect, vi, afterEach } from "vitest";
import { createHmac } from "crypto";
import { altShops, appForShop, webhookSecrets } from "../src/lib/shopify/client";
import { verifyWebhookHmac } from "../src/lib/shopify/hmac";

afterEach(() => vi.unstubAllEnvs());

function stubApps() {
  vi.stubEnv("SHOPIFY_API_KEY", "main-key");
  vi.stubEnv("SHOPIFY_API_SECRET", "main-secret");
  vi.stubEnv("SHOPIFY_WEBHOOK_SECRET", "main-webhook");
  vi.stubEnv("SHOPIFY_ALT_API_KEY", "alt-key");
  vi.stubEnv("SHOPIFY_ALT_API_SECRET", "alt-secret");
  vi.stubEnv("SHOPIFY_ALT_SHOPS", " FFN9TX-FF.myshopify.com , other.myshopify.com ");
}

describe("appForShop", () => {
  it("routes listed shops to the second app, case-insensitively", () => {
    stubApps();
    expect(appForShop("ffn9tx-ff.myshopify.com")).toEqual({ apiKey: "alt-key", apiSecret: "alt-secret", webhookSecret: "alt-secret" });
  });
  it("keeps every other shop on the main app", () => {
    stubApps();
    expect(appForShop("ecomos-dev-seed.myshopify.com")).toEqual({
      apiKey: "main-key",
      apiSecret: "main-secret",
      webhookSecret: "main-webhook",
    });
  });
  it("uses the main app for everyone when no second app is configured", () => {
    stubApps();
    vi.stubEnv("SHOPIFY_ALT_SHOPS", "");
    expect(altShops()).toEqual([]);
    expect(appForShop("ffn9tx-ff.myshopify.com").apiKey).toBe("main-key");
  });
});

describe("webhook signatures", () => {
  const sign = (body: string, secret: string) => createHmac("sha256", secret).update(body, "utf8").digest("base64");
  const accepted = (body: string, hmac: string) => webhookSecrets().some((s) => verifyWebhookHmac(body, hmac, s));

  it("accepts deliveries signed by either app and rejects anything else", () => {
    stubApps();
    const body = '{"id":1}';
    expect(accepted(body, sign(body, "main-webhook"))).toBe(true);
    expect(accepted(body, sign(body, "alt-secret"))).toBe(true);
    expect(accepted(body, sign(body, "attacker"))).toBe(false);
  });
});
