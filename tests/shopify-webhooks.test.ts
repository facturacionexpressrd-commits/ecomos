import { describe, it, expect } from "vitest";
import { WEBHOOK_TOPICS, callbackUrlFor, missingTopics } from "../src/lib/shopify/webhooks";

const APP = "https://app.example.com";

describe("shopify webhook registration", () => {
  it("builds a path-safe callback url per topic", () => {
    expect(callbackUrlFor(APP, "ORDERS_CREATE")).toBe("https://app.example.com/api/shopify/webhooks/orders-create");
    expect(callbackUrlFor(APP, "INVENTORY_LEVELS_UPDATE")).toBe(
      "https://app.example.com/api/shopify/webhooks/inventory-levels-update"
    );
  });

  it("wants every topic when nothing is registered", () => {
    expect(missingTopics([], APP)).toEqual([...WEBHOOK_TOPICS]);
  });

  it("skips topics already pointing at this app", () => {
    const existing = [{ topic: "ORDERS_CREATE", callbackUrl: callbackUrlFor(APP, "ORDERS_CREATE") }];
    expect(missingTopics(existing, APP)).not.toContain("ORDERS_CREATE");
    expect(missingTopics(existing, APP)).toHaveLength(WEBHOOK_TOPICS.length - 1);
  });

  it("re-registers a topic that points at a stale url", () => {
    const stale = [{ topic: "ORDERS_CREATE", callbackUrl: "https://dead-tunnel.trycloudflare.com/api/shopify/webhooks/orders-create" }];
    expect(missingTopics(stale, APP)).toContain("ORDERS_CREATE");
  });

  it("ignores subscriptions with no http callback (eventbridge etc.)", () => {
    expect(missingTopics([{ topic: "ORDERS_CREATE", callbackUrl: "" }], APP)).toContain("ORDERS_CREATE");
  });
});
