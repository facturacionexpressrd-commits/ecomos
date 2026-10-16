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
  aiGenerate: "ai:generate",
  productsManage: "products:manage",
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

export class UnauthenticatedError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "UnauthenticatedError";
  }
}

/** No single store can be resolved, so the caller has to say which one it means. */
export class AmbiguousStoreError extends Error {
  readonly storeIds: string[];
  constructor(storeIds: string[]) {
    super("Ambiguous store: pass an explicit storeId");
    this.name = "AmbiguousStoreError";
    this.storeIds = storeIds;
  }
}

/**
 * Pure decision function: which store should a request act on?
 *
 * With an explicit `requestedStoreId`, that store must carry the capability — a store the user
 * cannot use for this is a ForbiddenError, never silently swapped for one they can.
 * With no request, the single store that carries the capability is used; zero is Forbidden and
 * more than one is Ambiguous, so a multi-store user never gets an arbitrary store picked for them.
 */
export function resolveStoreId(
  grants: StoreAccessGrant[],
  capability: string,
  requestedStoreId?: string
): string {
  if (requestedStoreId) {
    if (!hasCapability(grants, requestedStoreId, capability)) throw new ForbiddenError(capability);
    return requestedStoreId;
  }

  const eligible = [
    ...new Set(
      grants.filter((grant) => grant.capabilities.includes(capability)).map((g) => g.storeId)
    ),
  ];
  if (eligible.length === 0) throw new ForbiddenError(capability);
  if (eligible.length > 1) throw new AmbiguousStoreError(eligible);
  return eligible[0];
}

/**
 * The authenticated entry point for route handlers that act on one store: resolves the Supabase
 * session, loads the caller's grants and checks `capability` before any data is touched.
 *
 * Replaces the former `requireActiveBusiness()`, which returned `{ storeId: '', userId: '' }`
 * from a placeholder and so authenticated nobody while being called as "verify auth".
 */
export async function requireStoreAccess(
  capability: string,
  requestedStoreId?: string
): Promise<{ storeId: string; userId: string }> {
  // Importada aquí dentro: `next/headers` solo existe en una petición, y este módulo también
  // se carga en las pruebas unitarias por sus funciones puras.
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new UnauthenticatedError();

  const grants = await loadStoreAccessGrants(user.id);
  return { storeId: resolveStoreId(grants, capability, requestedStoreId), userId: user.id };
}
