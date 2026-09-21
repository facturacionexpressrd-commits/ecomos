import { prisma } from "@/lib/db";

/** Every capability this phase knows about. New ones are additive — no migration needed. */
export const CAPABILITIES = {
  storeRead: "store:read",
  storeSync: "store:sync",
  storeConnect: "store:connect",
  ordersRead: "orders:read",
  orgManageUsers: "org:manage_users",
  approvalsDecide: "approvals:decide",
  campaignsManage: "campaigns:manage",
} as const;

export const OWNER_CAPABILITIES: string[] = Object.values(CAPABILITIES);

/** Minimal projection of UserStoreAccess + its Role, enough to decide a capability check. */
export type StoreAccessGrant = {
  storeId: string;
  capabilities: string[];
};

export class ForbiddenError extends Error {
  constructor(capability: string) {
    super(`Missing capability: ${capability}`);
    this.name = "ForbiddenError";
  }
}

/**
 * Pure decision function: does this set of grants include `capability` for `storeId`?
 * No DB access — takes the caller's grants as input so it's trivially unit-testable
 * (allowed / denied / "store belongs to someone else" all become plain data).
 */
export function hasCapability(
  grants: StoreAccessGrant[],
  storeId: string,
  capability: string
): boolean {
  return grants.some(
    (grant) => grant.storeId === storeId && grant.capabilities.includes(capability)
  );
}

/** Loads a user's grants (their UserStoreAccess rows joined to Role.capabilities). */
export async function loadStoreAccessGrants(userId: string): Promise<StoreAccessGrant[]> {
  const access = await prisma.userStoreAccess.findMany({
    where: { userId },
    select: { storeId: true, role: { select: { capabilities: true } } },
  });

  return access.map((a) => ({ storeId: a.storeId, capabilities: a.role.capabilities }));
}

/**
 * The single enforcement point every route handler / server action calls before
 * touching store-scoped data. Throws ForbiddenError if the user lacks the capability.
 */
export async function requireCapability(
  userId: string,
  storeId: string,
  capability: string
): Promise<void> {
  const grants = await loadStoreAccessGrants(userId);
  if (!hasCapability(grants, storeId, capability)) {
    throw new ForbiddenError(capability);
  }
}

/**
 * Org-wide check (e.g. "can invite users") that ignores storeId — every grant a user
 * holds is already within their one organization (User.organizationId), so "has this
 * capability on any store I can see" is equivalent to "has it in my org" for Phase 0.
 */
export function hasOrgCapability(grants: StoreAccessGrant[], capability: string): boolean {
  return grants.some((grant) => grant.capabilities.includes(capability));
}

export async function requireOrgCapability(userId: string, capability: string): Promise<void> {
  const grants = await loadStoreAccessGrants(userId);
  if (!hasOrgCapability(grants, capability)) {
    throw new ForbiddenError(capability);
  }
}
