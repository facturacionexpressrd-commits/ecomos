import { describe, it, expect } from "vitest";
import {
  AmbiguousStoreError,
  ForbiddenError,
  resolveStoreId,
  type StoreAccessGrant,
} from "@/lib/auth/capabilities";

const grants: StoreAccessGrant[] = [
  { storeId: "store-a", capabilities: ["store:read", "campaigns:manage"] },
  { storeId: "store-b", capabilities: ["store:read"] },
];

describe("resolveStoreId with an explicit store", () => {
  it("uses the requested store when it carries the capability", () => {
    expect(resolveStoreId(grants, "campaigns:manage", "store-a")).toBe("store-a");
  });

  it("denies a store the user can read but not manage", () => {
    expect(() => resolveStoreId(grants, "campaigns:manage", "store-b")).toThrow(ForbiddenError);
  });

  it("denies a store the user has no grant for", () => {
    expect(() => resolveStoreId(grants, "store:read", "store-c")).toThrow(ForbiddenError);
  });

  it("never substitutes a store the user can use for one they cannot", () => {
    // store-b lacks campaigns:manage; store-a has it. Asking for store-b must fail, not
    // silently act on store-a.
    expect(() => resolveStoreId(grants, "campaigns:manage", "store-b")).toThrow(ForbiddenError);
  });

  it("denies everything against an empty grant list", () => {
    expect(() => resolveStoreId([], "store:read", "store-a")).toThrow(ForbiddenError);
  });
});

describe("resolveStoreId without an explicit store", () => {
  it("uses the only store that carries the capability", () => {
    expect(resolveStoreId(grants, "campaigns:manage")).toBe("store-a");
  });

  it("refuses to guess when several stores qualify", () => {
    const error = (() => {
      try {
        resolveStoreId(grants, "store:read");
        return null;
      } catch (cause) {
        return cause;
      }
    })();

    expect(error).toBeInstanceOf(AmbiguousStoreError);
    expect((error as AmbiguousStoreError).storeIds).toEqual(["store-a", "store-b"]);
  });

  it("is forbidden, not ambiguous, when no store qualifies", () => {
    expect(() => resolveStoreId(grants, "org:manage_users")).toThrow(ForbiddenError);
  });

  it("is forbidden against an empty grant list", () => {
    expect(() => resolveStoreId([], "store:read")).toThrow(ForbiddenError);
  });

  it("treats duplicate grants on one store as a single store", () => {
    // Two roles on the same store must not look like an ambiguous multi-store user.
    const duplicated: StoreAccessGrant[] = [
      { storeId: "store-a", capabilities: ["store:read"] },
      { storeId: "store-a", capabilities: ["store:read", "orders:read"] },
    ];
    expect(resolveStoreId(duplicated, "store:read")).toBe("store-a");
  });

  it("ignores an empty requested store and falls back to resolution", () => {
    expect(resolveStoreId(grants, "campaigns:manage", "")).toBe("store-a");
  });
});
