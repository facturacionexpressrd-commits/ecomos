# EcomOS — Integrations

## Shopify (Phase 1 — implemented)

**Auth**: standard OAuth 2.0 authorization code grant.

1. `GET /api/shopify/install?shop=<shop>.myshopify.com` — builds the Shopify
   authorize URL with `client_id`, requested `scope`, `redirect_uri`, and a
   signed `state` param (HMAC over a random nonce + org id, so the callback
   can't be forged or replayed against the wrong org). Redirects the browser
   to Shopify.
2. `GET /api/shopify/callback?code=...&shop=...&state=...&hmac=...` —
   verifies Shopify's `hmac` query param against the full query string,
   verifies our own `state`, exchanges `code` for an access token
   (`POST https://<shop>/admin/oauth/access_token`), encrypts the token, and
   upserts the `Store` row (`status: connected`, `connectedAt: now()`).
   Enqueues an initial `syncStore` job.

**API used**: Shopify GraphQL Admin API (`/admin/api/<version>/graphql.json`),
not REST — REST is legacy for new integrations. API version is pinned in
`src/lib/shopify/client.ts` (`SHOPIFY_API_VERSION` constant) and bumped
deliberately, not left on `unstable`/`latest`.

**Sync** (`src/lib/shopify/sync.ts`): paginated GraphQL queries
(`products`, `orders`, `customers`) using cursor-based pagination
(`first` / `after` / `pageInfo.hasNextPage`), plus a per-variant
`inventoryLevels` query. Each page's results are upserted immediately
(not buffered for the whole sync) so a crash mid-sync loses at most one
page of progress, not the whole run.

**Webhooks** (`src/app/api/shopify/webhooks/[topic]/route.ts`):
registered topics for this phase: `products/update`, `orders/create`,
`orders/updated`, `customers/update`, `inventory_levels/update`.
Every request:
1. Read the raw body (required — HMAC is computed over raw bytes, not
   parsed JSON).
2. Verify `X-Shopify-Hmac-Sha256` using the app's webhook secret
   (`SHOPIFY_WEBHOOK_SECRET`). Reject with 401 on mismatch.
3. Insert a `WebhookEvent` keyed on `X-Shopify-Webhook-Id`. Unique
   constraint violation → already processed → return 200, no-op.
4. Enqueue `processWebhook` with the topic + store id + parsed payload.
   Return 200 immediately — Shopify expects a fast response and retries
   on timeout, which is exactly what the idempotency check protects
   against.

**Required env vars** (see `.env.example`):
`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_WEBHOOK_SECRET`,
`SHOPIFY_APP_URL` (base URL used to build `redirect_uri`),
`SHOPIFY_SCOPES` (comma-separated, e.g.
`read_products,read_orders,read_customers,read_inventory`).

**Setting up a real dev store to test against** (do this once, outside this
session):
1. Create a Shopify Partner account → create a development store.
2. Create a custom app (or Partner app) with the scopes above, note the
   API key/secret.
3. Fill in `.env` with those values + a public/tunnel `SHOPIFY_APP_URL`
   (Shopify requires HTTPS for OAuth redirect + webhooks — use `ngrok` or
   similar for local dev).
4. Visit `/api/shopify/install?shop=<your-dev-store>.myshopify.com` to
   connect.

## Supabase (Phase 0 — implemented)

Used for two things only: **Postgres** (via `DATABASE_URL`, consumed by
Prisma) and **Auth** (via `@supabase/ssr`, consumed by `src/lib/supabase/*`).
No other Supabase feature (Storage, Realtime, Edge Functions) is used in
this phase.

**Required env vars**: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only,
used for admin actions like creating a user record on invite acceptance).

**Setup** (outside this session): create a free Supabase project, copy the
project URL + anon key + service role key + the Postgres connection string
into `.env`.

## Deferred (not built, per brief)

Meta Ads, supplier APIs, AI providers: no client code, no env vars, no
tables. When one of these is scoped for a later phase, it gets its own
section here.
