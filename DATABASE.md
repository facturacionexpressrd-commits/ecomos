# EcomOS — Database

Prisma schema lives at `prisma/schema.prisma`. This file explains the *why*
behind it; read the schema itself for exact fields/types.

## Tenancy shape

```
Organization
 ├─ User (id = Supabase auth uid)
 ├─ Role (name + capabilities: string[])
 ├─ Store (one Shopify connection each)
 │   ├─ UserStoreAccess (User × Store × Role)
 │   ├─ Product ── ProductVariant ── InventoryLevel
 │   ├─ Customer ── Order
 │   └─ WebhookEvent
 ├─ Invitation (email + Role + optional Store scope)
 └─ AuditLog
```

Everything scopes to `Organization`, either directly or by hanging off a
`Store` that belongs to one. There is no cross-organization foreign key
anywhere — a query that joins through `Store`/`User` can't accidentally leak
another org's rows as long as it filters by `organizationId` (or by a
`storeId` the caller is already authorized for) at the top.

## RBAC model: capabilities, not role names

`Role.capabilities` is a flat `String[]` such as
`["store:read", "store:sync", "orders:read"]`. Reasons:

- Adding a new permission (e.g. `inventory:write`) is a data change (add the
  string to a role), not a schema migration or an enum edit.
- `UserStoreAccess` is what's actually checked at request time — it's the
  join of "this user has this role on this store." A user can hold different
  roles on different stores in the same org (e.g. read-only on Store A,
  full sync rights on Store B).
- The pure-function check (`hasCapability`, see `src/lib/auth/capabilities.ts`)
  takes the caller's `UserStoreAccess[]` (already scoped to their org) and a
  target `storeId` + capability string, and returns a boolean. No DB access
  inside the check itself — makes it trivial to unit test allowed / denied /
  "store belongs to someone else" cases.

## Shopify sync tables

- Every synced row is unique on `(storeId, shopifyGid)` — Shopify's GraphQL
  IDs (`gid://shopify/Product/123`) are the natural external key, so re-sync
  is a plain upsert, not an insert-then-reconcile.
- Each table keeps a `raw Json` snapshot of the full Shopify object alongside
  a handful of typed columns (`title`, `price`, `totalPrice`, `available`,
  etc.) — the typed columns are only what the Phase 1 dashboard needs to
  query/aggregate directly; `raw` is the escape hatch for anything a later
  phase needs without a migration.
- `Order.totalPrice` / `ProductVariant.price` are `Decimal(12,2)` — money is
  never a float.

## Webhook idempotency

`WebhookEvent.shopifyWebhookId` has a **unique constraint**. The webhook
route always tries to insert a `WebhookEvent` row first; if that insert
violates uniqueness (Prisma `P2002`), the handler treats it as "already seen"
and returns 200 without re-enqueueing the `processWebhook` job. This is the
actual mechanism — the schema, not just application logic, is what prevents
double-processing, so it holds even under concurrent duplicate deliveries.

## Migrations

Standard Prisma flow: `npx prisma migrate dev --name <change>` locally,
`npx prisma migrate deploy` in CI/production. No manual SQL outside Prisma
migrations unless Prisma can't express it (none needed yet).
