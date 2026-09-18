# EcomOS

Multi-store e-commerce operations platform. This is Phase 0 (foundation:
org/user/role/store model, invitation-based auth, capability RBAC) + Phase 1
(Shopify core: OAuth connect, product/order/customer/inventory sync,
idempotent webhooks, one dashboard). See [ARCHITECTURE.md](./ARCHITECTURE.md),
[DATABASE.md](./DATABASE.md), and [INTEGRATIONS.md](./INTEGRATIONS.md) for the
design — they're the source of truth for later phases too.

## Setup

1. **Install deps**: `npm install`
2. **Create a Supabase project** (free tier is fine): supabase.com → New
   project. Copy into `.env` (see `.env.example`):
   - `DATABASE_URL` — Settings → Database → Connection string (use the
     pooled/transaction connection string)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
     `SUPABASE_SERVICE_ROLE_KEY` — Settings → API
3. **Generate a `TOKEN_ENCRYPTION_KEY`**: any long random string, e.g.
   `openssl rand -hex 32`.
4. **Run migrations**: `npm run db:migrate`
5. **Sign up** at `/login` (after `npm run dev`) with the email that should
   own the first organization.
6. **Bootstrap the first org**:
   `SEED_ORG_NAME="My Company" SEED_OWNER_EMAIL="you@example.com" npm run db:seed`
7. **Shopify** (only needed to actually connect a store — see
   [INTEGRATIONS.md](./INTEGRATIONS.md) for the full walkthrough): create a
   Partner account + dev store + app, fill in `SHOPIFY_API_KEY`,
   `SHOPIFY_API_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_APP_URL` in
   `.env`.

## Running

```bash
npm run dev      # Next.js app on :3000
npm run worker   # background job worker (Shopify sync + webhook processing)
```

Both need to be running for a store connect to actually sync data — the app
enqueues jobs, the worker processes them.

## Testing

```bash
npm test         # RBAC + webhook idempotency unit tests — no live DB needed
npm run build    # type-checks the whole app
```

## Connecting a store

Once signed in and `.env` has real Shopify credentials:

```
/api/shopify/install?shop=your-dev-store.myshopify.com
```

This redirects through Shopify's OAuth consent screen and back to
`/dashboard` once connected. The account that ran the install gets full
("Owner") access to that store automatically; invite teammates via
`POST /api/invitations` (see [ARCHITECTURE.md](./ARCHITECTURE.md#multi-tenancy--rbac)).
