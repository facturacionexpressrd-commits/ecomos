# EcomOS Development Setup

## Quick Start

### 1. Start Local Database

```bash
# Install Docker Desktop (https://www.docker.com/products/docker-desktop) if not already installed
# Then run:
docker-compose up -d

# Verify it's running:
docker ps
```

The database will be available at `postgresql://postgres:postgres@localhost:5432/ecomos`.

### 2. Run Migrations

```bash
npm run db:generate
npm run db:migrate
```

This applies all migrations from `prisma/migrations/` to your local database.

### 3. Start Dev Server

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment Files

- **`.env`** — Production Supabase credentials (committed to repo)
- **`.env.local`** — Local development overrides (not committed)

`.env.local` overrides `.env`, so you can use a local database while keeping Supabase Auth for testing sign-in.

## Database Management

### View Data (Prisma Studio)
```bash
npx prisma studio
```

Opens http://localhost:5555 to browse/edit data directly.

### Reset Database
```bash
# WARNING: Deletes all data
npm run db:migrate -- --skip-generate --force-reset
```

### Create New Migration
```bash
# After editing schema.prisma:
npm run db:migrate -- --create-only --name my_migration_name
```

## Testing

```bash
# Run all tests
npm test

# Run specific test file
npm test -- finance-formulas.test.ts

# Watch mode
npm test -- --watch
```

## Finance Layer

### Schema

**OrderLineItem:** revenue fact per line. Shopify reports gross (before discount)
and net (after discount) separately.

**Refund:** refund header (when, how much, Shopify's ID). **RefundLine:** which
line items were refunded. Amounts are product only (Refund.amount includes tax +
shipping; RefundLine.subtotal is just the line's share).

**FinancialTransaction:** payment ledger (sale, refund, void, etc.) as reported
by Shopify. Gateway (Stripe, etc.), status (success, pending), kind. Amount can
be negative.

**Store.paymentFeePercent/Fixed:** per-store estimate of card processing fees
(e.g., 2.9% + $0.30). This is an estimate; Shopify's actual per-transaction fees
are not synced. Update in `prisma studio` or via an admin form.

### Formulas

Pure functions in `src/lib/finance/formulas.ts`. All 42 tests pass.

**Store-level:**
- `contributionProfit(grossRevenue, refunds, paymentFeesPercentage, totalCogs)`
- `contributionMargin(grossRevenue, refunds, paymentFeesPercentage, totalCogs)`
- `breakEvenCpa(contributionProfit, uniqueCustomers, adSpend)`
- `maxSustainableCpa(contributionProfit, uniqueCustomers)`
- `breakEvenRoas(grossRevenue, adSpend)` — revenue ROAS, not profit
- `contributionRoas(contributionProfit, adSpend)` — true profitability
- `adPaybackPeriodDays(contributionProfit, adSpend, periodDays)`

**Variant-level:**
- `variantContribution(price, cost, quantity, paymentFeesPercentage)`
- `variantContributionMargin(price, cost, quantity, paymentFeesPercentage)`

**Meta ads (Phase 2):**
- `metaRevenueRoas(attributedRevenue, adSpend)`
- `metaContributionRoas(attributedProfit, adSpend)`
- `metaCpa(adSpend, conversions)`
- `metaProfitabilityIndex(attributedProfit, adSpend)`

### Sync

`src/lib/shopify/sync.ts` fetches Shopify GraphQL and populates all tables
idempotently (by `storeId_shopifyGid` unique constraint).

- **LineItems:** per order, at upsert time
- **Refunds + RefundLines:** per order, matches lines by shopifyGid
- **Transactions:** per order, separate kind/status/gateway for each

### Usage

Product detail page (`/dashboard/products/[id]`):
- Fetches variant refunds per variant (RefundLine aggregation)
- Reads Store.paymentFeePercent and Fixed
- Computes contribution profit and margin via formulas
- Shows per-variant economics with methodology labels

Cost entry form: manual COGS per variant, POSTed to `/api/variants/cost`

## Order Routing & Fulfillment (Session 12)

### Schema

**OrderRoute:** Assigns each line item to a supplier offer. One route per line
item, built when an order is routed. Stores the decision reason and who made it.

**SupplierOrder:** Groups line items by supplier. One record per order+supplier
pair. Aggregates cost, shipping, and estimated margin from routed line items.

**Fulfillment:** Tracks fulfillment status of a SupplierOrder (pending, processing,
shipped, delivered, failed). Links to Shipment once shipped.

**Shipment:** Tracking info (carrier, tracking number, estimated/actual delivery).
Created when a SupplierOrder ships. Links to TrackingEvents.

**TrackingEvent:** Status updates (in_transit, out_for_delivery, delivered, etc.)
from the supplier's tracking API. Timestamp per event.

**FulfillmentException:** Issues during fulfillment (out_of_stock, payment_failed,
customs_delay, etc.). Severity (low/medium/high/critical). Recommended action is
plain text field for now.

### Routing Algorithm

`src/lib/orders/routing.ts`:

**routeOrderLineItems(orderId):**
1. Fetch order with line items → products → canonical product → supplier offers
2. For each line item, pick the cheapest available supplier (cost + shipping)
3. Store route decision in OrderRoute table
4. Return list of routing decisions

**createSupplierOrdersFromRoutes(orderId):**
1. Group routes by supplier
2. For each supplier, aggregate costs and shipping
3. Estimate margin: Revenue - (SupplierCost + Shipping + PaymentFees)
4. Create SupplierOrder with aggregated totals

### API Endpoints

**POST `/api/orders/route`** — Route a single order
- Request: `{ orderId, storeId }`
- Response: list of SupplierOrders created, with costs and margins

**PATCH `/api/exceptions/[id]`** — Update exception status
- Request: `{ storeId, isResolved, recommendedAction }`
- Response: updated exception record

### Order Hub Screen

`src/app/dashboard/orders/page.tsx`:
- Displays all store orders, newest first (paginated)
- For each order: total price, estimated margin, fulfillment status
- Shows all supplier orders for that order with:
  - Supplier name + status badge
  - Cost, shipping, margin breakdown
  - Latest tracking event (status + timestamp)
  - Open exceptions count + summary

### Fulfillment Exception Center

`src/app/dashboard/exceptions/page.tsx`:
- Lists all unresolved exceptions across store
- Stats: total issues, critical count, high count, unresolved count
- Filter by resolved/unresolved, by severity
- Click to edit: add recommended action + mark resolved
- Tracks who resolved and when

### Usage

**When an order arrives from Shopify:**
1. Sync updates Order + OrderLineItem via `syncOrders()`
2. Call `POST /api/orders/route` to assign each line to a supplier
3. SupplierOrder and Fulfillment records created automatically
4. Order Hub displays progress

**When a supplier ships:**
Not automated yet. The old tracking sync invented random statuses and was removed; real
tracking arrives with the first real supplier adapter (`SupplierAdapter` in
`src/lib/suppliers/adapter.ts`), which should write TrackingEvents from the supplier's API.

**When an issue occurs:**
1. External system or manual entry creates FulfillmentException
2. Exception Center highlights it by severity
3. User adds recommended action and marks resolved
4. Exception removed from "unresolved" count


## Product Economics Flow

1. **Product Detail Page:** `src/app/dashboard/products/[id]/page.tsx`
   - Shows all variants with price, cost, inventory
   - Displays contribution profit/margin per variant
   - Lists store-level metrics

2. **Cost Entry Form:** `src/components/products/CostEntryForm.tsx`
   - Client-side form to set/update COGS per variant
   - Submits to `/api/variants/cost`

3. **Cost API:** `src/app/api/variants/cost/route.ts`
   - Updates `ProductVariant.cost` in database
   - Logs action to `AuditLog` for compliance

## Troubleshooting

**"Can't reach database server"**
- Is `docker-compose up` running? Check with `docker ps`
- Wrong DATABASE_URL in `.env.local`? Should be `postgresql://postgres:postgres@localhost:5432/ecomos`

**"Supabase Auth not working"**
- Are NEXT_PUBLIC_SUPABASE_* keys set in `.env.local`?
- Is the Supabase project (rutentcszxqncpsqjqsc) still active?
- Try checking Supabase dashboard: https://supabase.com/dashboard

**"Migrations failed"**
- Did you run `npm run db:generate` first?
- Does the schema.prisma have syntax errors?
- Try `npx prisma format` to auto-fix formatting

## Commit & Deploy

Before pushing:
```bash
npm run lint      # Check for errors
npm test          # Run all tests
npm run build     # Test production build
```

Then commit and push to GitHub.
