import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Shopify and an in-memory stand-in for the few Prisma calls the sync makes.
const graphql = vi.fn();
const storeUpdates: Record<string, unknown>[] = [];
const store = {
  id: "s1",
  shopDomain: "demo.myshopify.com",
  accessTokenEncrypted: "enc",
  customersSyncedAt: new Date("2026-09-20T00:00:00Z") as Date | null,
  productsSyncedAt: null as Date | null,
  ordersSyncedAt: null as Date | null,
};

vi.mock("@/lib/shopify/client", () => ({ shopifyGraphQL: (...args: unknown[]) => graphql(...args) }));
vi.mock("@/lib/crypto", () => ({ decryptSecret: (s: string) => s }));
vi.mock("@/lib/db", () => ({
  prisma: {
    store: {
      findUniqueOrThrow: async () => store,
      update: async ({ data }: { data: Record<string, unknown> }) => storeUpdates.push(data),
    },
    customer: { upsert: async () => ({}) },
    productVariant: { findMany: async () => [] },
  },
}));

const { syncStore, updatedSinceQuery } = await import("../src/lib/shopify/sync");

const page = (key: string, updatedAts: string[], next: string | null) => ({
  [key]: {
    nodes: updatedAts.map((u, i) => ({ id: `gid://${key}/${i}`, updatedAt: u, email: null, displayName: null })),
    pageInfo: { hasNextPage: next !== null, endCursor: next },
  },
});
const empty = (key: string) => page(key, [], null);

beforeEach(() => {
  graphql.mockReset();
  storeUpdates.length = 0;
});

describe("updatedSinceQuery", () => {
  it("builds an inclusive Shopify search filter, or none for a first sync", () => {
    expect(updatedSinceQuery(new Date("2026-09-20T00:00:00Z"))).toBe("updated_at:>='2026-09-20T00:00:00.000Z'");
    expect(updatedSinceQuery(null)).toBeNull();
  });
});

describe("syncStore (incremental)", () => {
  it("asks only for records changed since the watermark and advances it after every page", async () => {
    graphql
      .mockResolvedValueOnce(page("customers", ["2026-09-21T01:00:00Z", "2026-09-21T02:00:00Z"], "c1"))
      .mockResolvedValueOnce(page("customers", ["2026-09-22T05:00:00Z"], null))
      .mockResolvedValueOnce(empty("products"))
      .mockResolvedValueOnce(empty("orders"));

    expect(await syncStore("s1")).toBe(true);

    const [, , , firstVars] = graphql.mock.calls[0];
    expect(firstVars).toEqual({ cursor: null, query: "updated_at:>='2026-09-20T00:00:00.000Z'" });
    expect(graphql.mock.calls[1][3]).toEqual({ cursor: "c1", query: "updated_at:>='2026-09-20T00:00:00.000Z'" });
    // Never-synced resources fetch everything.
    expect(graphql.mock.calls[2][3]).toEqual({ cursor: null, query: null });
    expect(storeUpdates).toEqual([
      { customersSyncedAt: new Date("2026-09-21T02:00:00Z") },
      { customersSyncedAt: new Date("2026-09-22T05:00:00Z") },
    ]);
  });

  it("stops before starting a page once past the deadline, and says it isn't done", async () => {
    expect(await syncStore("s1", Date.now() - 1)).toBe(false);
    expect(graphql).not.toHaveBeenCalled();
    expect(storeUpdates).toEqual([]);
  });
});
