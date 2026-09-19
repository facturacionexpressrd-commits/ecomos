# EcomOS Architecture

## System Overview

EcomOS is a unified operations platform for e-commerce businesses. It centralizes product management, order fulfillment, financials, and growth across Shopify stores.

**Tech Stack:**
- **Frontend:** Next.js 14+ with TypeScript, Tailwind CSS
- **Backend:** Next.js API routes with tRPC
- **Database:** PostgreSQL (via Supabase) with Prisma ORM
- **Auth:** Supabase Auth (JWT-based, password + OAuth)
- **Async Jobs:** Supabase pg_cron for scheduled tasks
- **Webhooks:** Shopify Admin API with signature verification

## Domain Model

### Core Entities
- **Organization** — top-level tenant
- **Store** — Shopify store connection (one org → many stores)
- **User** — platform user
- **Role** — Org roles (Owner, Admin, Manager, Analyst, Member)
- **UserStoreAccess** — row-level store assignment
- **Product** — synced from Shopify
- **Variant** — product variant with cost/pricing
- **Order** — synced from Shopify
- **Customer** — synced from Shopify
- **InventoryLevel** — stock per location
- **AuditLog** — immutable event log

### Financial Entities (Phase 1.5+)
Stubbed in schema but logic deferred:
- FinancialTransaction, CostAllocation, RevenueRecord, Refund, DailyFinancialMetric

## Security & RBAC

**Authentication:**
- Supabase Auth (email/password, Google OAuth)
- JWT tokens in httpOnly cookies

**Authorization:**
- Role assigned at Organization level
- Store access controlled via UserStoreAccess
- Server-side enforcement on all queries/mutations

**Capability Matrix:**

| Role    | Create Store | Manage Products | View Orders | View Analytics | Manage Users |
|---------|--------------|-----------------|-------------|----------------|--------------|
| Owner   | ✓            | ✓               | ✓           | ✓              | ✓            |
| Admin   | ✗            | ✓               | ✓           | ✓              | ✓            |
| Manager | ✗            | ✓               | ✓           | ✗              | ✗            |
| Analyst | ✗            | ✗               | ✓           | ✓              | ✗            |
| Member  | ✗            | ✗               | ✗           | ✗              | ✗            |

## Shopify Integration

**OAuth Flow:**
1. User initiates "Connect Store" → redirect to Shopify OAuth
2. Shopify returns access token → encrypted in Store table
3. System verifies webhook signature on all inbound requests

**Sync:**
- **Products/Variants:** GraphQL bulk operation (async)
- **Orders/Customers:** GraphQL paginated queries (async)
- **Inventory:** Real-time webhook + scheduled reconciliation
- **Idempotency:** deduplicated by Shopify ID + timestamp

**Webhooks:**
- `products/update`, `products/delete`
- `orders/create`, `orders/updated`
- `inventory_levels/update`
- All webhook payloads signature-verified (HMAC-SHA256)
- Stored in AuditLog

## Background Jobs

**Supabase pg_cron Schedule:**
- Sync Products: daily at 2 AM UTC
- Sync Orders: every 4 hours
- Sync Inventory: hourly full reconciliation

**Error Handling:**
- Retry on transient errors (3x, exponential backoff)
- Log failures to AuditLog
- Alert on repeated failures (Phase 2+)

## API Design

**tRPC Routers:**
- `auth` — login, logout, session
- `store` — connect, list
- `product` — list, get, search (read-only)
- `order` — list, get
- `customer` — list, get
- `user` — manage org users, invitations
- `audit` — read logs

**All endpoints:**
- Require valid session + store access check
- Return tRPC errors with user-friendly messages
- Pagination: `limit, offset`

## UI/Dashboard Structure

**Phase 1 Deliverable:** Portfolio Dashboard
- Store selector
- KPI cards: Revenue, Orders, Customers (30d)
- Product inventory heatmap
- Recent orders table
- Customer segments

**Out of Scope (Phase 0+1):**
- Meta ads, suppliers, AI, creative studio, research, approval workflows
- Finance logic beyond raw Shopify sync

## Phase 2: Meta Ads Integration

**Goal:** Connect Meta (Facebook/Instagram) ad accounts, track spend per campaign, calculate true ROAS (revenue vs. contribution profit).

**Meta Entities:**
- **MetaAccount** — Meta Business account connection (OAuth token)
- **MetaCampaign** — Ad campaign metadata + spend totals
- **MetaAdSet** — Ad set within campaign
- **MetaSpendDaily** — Daily ad spend rollup by campaign
- **OrderAttributionMetaad** — Link orders to Meta campaigns (heuristic: first-touch UTM param)

**Meta OAuth Flow:**
1. User clicks "Connect Meta Account"
2. OAuth to Meta, request `ads_read` scope
3. Store encrypted token in MetaAccount
4. Fetch business account ID, campaigns list
5. Start sync jobs

**Sync Strategy:**
- **Campaigns:** Every 4 hours (fetch latest spend, results)
- **Daily Spend:** Every 24 hours (archive daily snapshots)
- **Attribution:** Per-order analysis (extract utm_campaign from Shopify order source, match to Meta campaign)

**ROAS Calculations:**
- **Revenue ROAS** = Total Revenue / Total Ad Spend
- **Contribution ROAS** = Total Contribution Profit / Total Ad Spend
- **Break-even spend** = Contribution Profit / (1 - target ROAS factor)

**UI:**
- Campaign list (`/dashboard/meta/campaigns`) with spend, impressions, conversions, ROAS, profitability
  - Summary cards: total campaigns, total spend, estimated revenue, avg contribution ROAS
  - Sortable table: campaign name, status, spend, impressions, conversions, CPA, contrib ROAS, profitability
  - Filterable by status (ACTIVE/PAUSED)
- Campaign detail page (`/dashboard/campaigns/[id]`) showing:
  - Key metrics: spend, revenue ROAS, contribution ROAS, CPA
  - Efficiency benchmarks: break-even ROAS, max sustainable CPA
  - 30-day spend trend table (daily spend, impressions, conversions)
  - CPM, conversion rate, profit per $1 spent
- Campaigns accessible from integrations dashboard when Meta connected

**Revenue Attribution (MVP):**
- Spend-proportion heuristic: campaign revenue = store revenue × (campaign spend / total spend)
- Ready for upgrade to UTM tracking (utm_campaign → order source)
- Note: Real attribution requires order-level tracking in Shopify

**Out of Scope (Phase 2):**
- Multi-account aggregation
- Conversion tracking pixels
- Dynamic ads
- Audience insights
- Google Ads (Phase 3)

## Deployment

**Dev:** `npm run dev` + `npx prisma studio`
**Prod:** Vercel + Supabase (Phase 2)
