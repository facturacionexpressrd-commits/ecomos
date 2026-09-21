import { describe, it, expect } from "vitest";
import { listAdAccountChoices, openPending, sealPending } from "../src/lib/meta/connect";
import type { MetaClient } from "../src/lib/meta/client";

const KEY = "ab".repeat(32);

describe("pending ad-account selection", () => {
  it("round-trips the token and store", () => {
    const sealed = sealPending({ token: "tok", storeId: "s1" }, KEY, 1000);
    expect(openPending(sealed, KEY, 2000)).toEqual({ token: "tok", storeId: "s1" });
  });

  it("expires after ten minutes", () => {
    const sealed = sealPending({ token: "tok", storeId: "s1" }, KEY, 0);
    expect(openPending(sealed, KEY, 10 * 60 * 1000 - 1)).not.toBeNull();
    expect(openPending(sealed, KEY, 10 * 60 * 1000 + 1)).toBeNull();
  });

  it("rejects a tampered, foreign-keyed, missing or garbage cookie", () => {
    const sealed = sealPending({ token: "tok", storeId: "s1" }, KEY, 0);
    const flipped = sealed.slice(0, -2) + (sealed.endsWith("00") ? "11" : "00");
    expect(openPending(flipped, KEY, 1)).toBeNull();
    expect(openPending(sealed, "cd".repeat(32), 1)).toBeNull();
    expect(openPending(undefined, KEY, 1)).toBeNull();
    expect(openPending("not-a-cookie", KEY, 1)).toBeNull();
  });
});

describe("listAdAccountChoices", () => {
  const client = {
    getBusinessAccounts: async () => [
      { id: "b1", name: "Alpha" },
      { id: "b2", name: "Beta" },
    ],
    getAdAccounts: async (id: string) =>
      id === "b1"
        ? [{ id: "act_1", name: "Main", business_name: "Alpha", account_status: 1 }]
        : [
            { id: "act_2", name: "Test", business_name: "Beta", account_status: 1 },
            { id: "act_3", name: "Old", business_name: "Beta", account_status: 1 },
          ],
  } as unknown as MetaClient;

  it("flattens every business's ad accounts and keeps which business each belongs to", async () => {
    const choices = await listAdAccountChoices(client, "tok");
    expect(choices.map((c) => `${c.businessId}/${c.adAccountId}`)).toEqual(["b1/act_1", "b2/act_2", "b2/act_3"]);
    expect(choices[0].businessName).toBe("Alpha");
  });

  it("returns nothing when there are no businesses", async () => {
    const none = { getBusinessAccounts: async () => [], getAdAccounts: async () => [] } as unknown as MetaClient;
    expect(await listAdAccountChoices(none, "tok")).toEqual([]);
  });
});
