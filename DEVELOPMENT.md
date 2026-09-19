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

Finance formulas are pure functions in `src/lib/finance/formulas.ts`:
- `contributionProfit(grossRevenue, refunds, paymentFeesPercentage, totalCogs)`
- `contributionMargin(grossRevenue, refunds, paymentFeesPercentage, totalCogs)`
- `breakEvenCpa(contributionProfit, uniqueCustomers, adSpend)`
- `maxSustainableCpa(contributionProfit, uniqueCustomers)`
- `breakEvenRoas(grossRevenue, adSpend)`
- `contributionRoas(contributionProfit, adSpend)`
- `adPaybackPeriodDays(contributionProfit, adSpend, periodDays)`
- `variantContribution(price, cost, quantity, paymentFeesPercentage)`
- `variantContributionMargin(price, cost, quantity, paymentFeesPercentage)`

All 42 unit tests pass: `npm test -- finance-formulas.test.ts`

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
