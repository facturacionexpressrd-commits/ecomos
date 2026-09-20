# EcomOS

Multi-store e-commerce operations platform. Phases complete:

- **Phase 0:** org/user/role/store model, invitation-based auth, capability RBAC
- **Phase 1:** Shopify core — OAuth connect, product/order/customer/inventory sync, webhooks
- **Phase 1.5:** Finance layer — order line items (revenue facts), refunds, payment ledger, per-store fee config
- **Phase 2:** Meta Ads — campaign sync, daily spend rollup, order attribution, ROAS calculation

See [ARCHITECTURE.md](./ARCHITECTURE.md), [DATABASE.md](./DATABASE.md), and
[INTEGRATIONS.md](./INTEGRATIONS.md) for the design.

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
npm test         # 98 tests: RBAC, webhook idempotency, 42 finance formulas — no live DB needed
npm run build    # type-checks + builds for production
npm run lint     # strict ESLint (0 warnings, 0 errors)
```

## Connecting a store & syncing data

Once signed in and `.env` has real Shopify credentials:

```bash
# Install Shopify app
/api/shopify/install?shop=your-dev-store.myshopify.com

# Start worker (required for background sync jobs)
npm run worker
```

The OAuth flow redirects to `/dashboard` once connected. The installing account
gets full ("Owner") access automatically; invite teammates via `POST /api/invitations`.

**What gets synced:** products, variants, inventory, customers, orders, refunds,
payment transactions. Sync runs on install, then every 4 hours (orders), hourly
(inventory), and daily (products) via pg_cron jobs.

**Contribution profit:** automatically calculated per variant from Shopify revenue,
actual refunds, payment fees, and manual COGS entry. Open any product to see economics.
