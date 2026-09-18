import { describe, it, expect } from "vitest";
import { hasCapability, hasOrgCapability, type StoreAccessGrant } from "@/lib/auth/capabilities";

describe("hasCapability", () => {
  const grants: StoreAccessGrant[] = [
    { storeId: "store-a", capabilities: ["store:read", "orders:read"] },
    { storeId: "store-b", capabilities: ["store:read"] },
  ];

  it("allows when the grant for that store includes the capability", () => {
    expect(hasCapability(grants, "store-a", "orders:read")).toBe(true);
  });

  it("denies when the grant for that store lacks the capability", () => {
    expect(hasCapability(grants, "store-b", "orders:read")).toBe(false);
  });

  it("denies for a store the user has no grant for at all", () => {
    expect(hasCapability(grants, "store-c", "store:read")).toBe(false);
  });

  it("does not leak a capability granted on a different store", () => {
    // store-a has orders:read, store-b does not — access to A must not imply access to B.
    expect(hasCapability(grants, "store-b", "orders:read")).toBe(false);
    expect(hasCapability(grants, "store-a", "orders:read")).toBe(true);
  });

  it("denies against an empty grant list", () => {
    expect(hasCapability([], "store-a", "store:read")).toBe(false);
  });
});

describe("hasOrgCapability", () => {
  it("allows if any grant (regardless of store) has the capability", () => {
    const grants: StoreAccessGrant[] = [
      { storeId: "store-a", capabilities: ["store:read"] },
      { storeId: "store-b", capabilities: ["org:manage_users"] },
    ];
    expect(hasOrgCapability(grants, "org:manage_users")).toBe(true);
  });

  it("denies if no grant has the capability", () => {
    const grants: StoreAccessGrant[] = [{ storeId: "store-a", capabilities: ["store:read"] }];
    expect(hasOrgCapability(grants, "org:manage_users")).toBe(false);
  });
});
