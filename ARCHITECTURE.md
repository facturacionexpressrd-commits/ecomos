# EcomOS — Architecture

Source of truth for how the system is put together. Update this file when a
design decision is made — don't let decisions live only in code or chat.

## Stack

- **Next.js (App Router) + TypeScript + Tailwind CSS**, deployed as a single app.
- **Postgres** via **Prisma** — the only datastore. Supabase is used for its managed Postgres + Auth; the app talks to Postgres through `DATABASE_URL`, not through the Supabase client, except for auth.
- **Supabase Auth** handles identity (sign-up, sign-in, session cookies, magic links). `User.id` in Prisma is the Supabase `auth.users.id` — there is no separate password table.
- **pg-boss** for background jobs — a Postgres-backed queue, so no separate Redis/broker is required. One extra process (`npm run worker`) drains the queue; no route handler does long-running work.

## Request flow

```
Browser → Next.js route handler / server action
            → requireCapability() gate (see RBAC below)
            → Prisma (read/write Postgres)
            → (if async work needed) enqueue a pg-boss job, return immediately
Worker process → pg-boss job → Shopify GraphQL Admin API → Prisma writes
Shopify → webhook POST → route handler → HMAC verify → idempotency check → enqueue job
```

Nothing calls the Shopify API from inside a page render. Pages read from
Postgres only; the worker keeps Postgres in sync.

## Multi-tenancy & RBAC

- Top-level tenant is `Organization`. Every other row (except `Store`'s sync
  tables, which hang off `Store`) is scoped to an organization, directly or
  via `Store`.
- Access is **capability-based**, not role-name-based. A `Role` is just a
  name plus a `capabilities: string[]` (e.g. `store:read`, `store:sync`,
  `orders:read`, `org:manage_users`). `UserStoreAccess` links a user to a
  store through a role.
- **Single enforcement point**: `src/lib/auth/capabilities.ts` exports
  `hasCapability()` (pure function, unit tested) and
  `requireCapability(userId, storeId, capability)` (throws/redirects if
  missing). Every route handler and server action that touches store data
  calls `requireCapability` first — no per-route ad hoc checks.
- Invitations carry the same shape: an `Invitation` pre-assigns a `Role` (and
  optionally scopes to one `Store`), so accepting an invite is just "create a
  `UserStoreAccess` row," not a separate permission system.

## Shopify integration

- **OAuth**: `/api/shopify/install` builds the Shopify authorize URL (HMAC
  state param), `/api/shopify/callback` verifies the HMAC, exchanges the code
  for an access token, and stores the token **encrypted** (`accessTokenEncrypted`,
  AES-256-GCM via `TOKEN_ENCRYPTION_KEY`) on `Store`.
- **Sync**: `src/lib/shopify/sync.ts` runs paginated GraphQL Admin API
  queries for products/variants/orders/customers/inventory and upserts into
  Postgres, keyed on `(storeId, shopifyGid)`. Triggered by a `syncStore`
  pg-boss job — either on OAuth callback (initial backfill) or on a webhook
  (incremental).
- **Webhooks**: `/api/shopify/webhooks/[topic]/route.ts` verifies the
  `X-Shopify-Hmac-Sha256` header against the raw request body before parsing
  anything. Idempotency: every webhook carries `X-Shopify-Webhook-Id`; a
  unique constraint on `WebhookEvent.shopifyWebhookId` makes a duplicate
  delivery a no-op insert failure that the handler catches and ignores.

## Background jobs

- `src/lib/jobs/boss.ts` — single pg-boss instance, started by both the app
  (for enqueueing) and `src/worker/index.ts` (for processing).
- Two jobs for this phase: `syncStore` (full or incremental Shopify sync) and
  `processWebhook` (verify → dedupe → apply → mark `WebhookEvent.processed`).
- `# ponytail: one worker process, no concurrency tuning — add queue-specific
  concurrency / multiple workers when job volume actually demands it.`

## Deferred to later phases (noted here per the brief, not built)

- Meta ads, supplier integrations, AI features, creative studio, research,
  approval center: no tables, no routes, no UI.
- Finance beyond raw Shopify revenue (the dashboard shows `sum(Order.totalPrice)`
  for now — no cost/margin/multi-currency normalization yet).
- Notifications (no email/Slack/webhook-out system yet — invitations are
  link-only, no email delivery is wired up).
- If a Phase 0/1 decision constrains one of these (e.g. `AuditLog.action` is a
  free-text string, not an enum, so future action types don't need a
  migration), it's called out inline in code comments rather than here.
