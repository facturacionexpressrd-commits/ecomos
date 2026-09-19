# Campaigns UI — Phase 2 Deliverable

## Overview

The campaigns UI displays all Meta advertising campaigns with performance metrics, ROAS calculations, and profitability insights. It's the primary interface for tracking ad spend efficiency and identifying high/low performers.

## Routes

### Campaigns List Page
**URL:** `/dashboard/meta/campaigns`  
**Access:** All authenticated users with store access  
**Components:** `CampaignsTable`

**Displays:**
- Summary cards: total campaigns, total spend, estimated revenue, average contribution ROAS
- Sortable table with columns:
  - Campaign name (links to detail page)
  - Status (ACTIVE, PAUSED, ARCHIVED)
  - Ad spend ($)
  - Impressions
  - Conversions
  - Cost per action (CPA)
  - Contribution ROAS (color-coded: green ≥ 1.0, red < 1.0)
  - Profitability ($ profit per $1 spent)
- Filterable by status

**Sorting:**
- Default: by spend (descending)
- Click column header to sort by:
  - Spend
  - Contribution ROAS
  - Profitability

### Campaign Detail Page
**URL:** `/dashboard/campaigns/[id]`  
**Access:** Same store access as campaign  

**Displays:**
- Campaign metadata: name, objective, status, last sync time
- Key metrics cards (4 columns):
  - Total ad spend
  - Revenue ROAS
  - Contribution ROAS
  - Cost per action (CPA)
- Performance stats (3 columns):
  - Conversions (with conversion rate %)
  - CPM (cost per 1K impressions)
  - Profit per $1 spent (with ROI %)
- Efficiency benchmarks box:
  - Break-even ROAS (this ROAS = $0 profit)
  - Max sustainable CPA (highest CPA that still generates profit with 20% margin)
- 30-day spend trend (most recent 10 days):
  - Table with date, spend, impressions, conversions per day
- Attribution methodology note

## API Endpoint

### GET `/api/campaigns/list`
Fetches campaigns with calculated metrics.

**Query Parameters:**
- `storeId` (required) — store to fetch campaigns for
- `sortBy` (optional) — "spend" (default), "roas", "profitability"
- `status` (optional) — filter by campaign status

**Response:**
```json
{
  "campaigns": [
    {
      "id": "campaign-id",
      "name": "Summer Sale 2026",
      "status": "ACTIVE",
      "objective": "CONVERSIONS",
      "spend": 1250.00,
      "impressions": 45000,
      "conversions": 23,
      "revenueRoas": 3.45,
      "contributionRoas": 2.10,
      "profitability": 1.10,
      "estimatedRevenue": 4312.50,
      "estimatedProfit": 1375.00,
      "cpa": 54.35,
      "syncedAt": "2026-09-19T14:30:00Z",
      "createdAt": "2026-09-15T08:00:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "totalSpend": 5250.00,
    "totalRevenue": 18125.00,
    "avgContributionRoas": 1.95
  }
}
```

**Error Responses:**
- `400` — missing storeId
- `401` — not authenticated
- `403` — no access to store
- `500` — database/sync error

## Components

### CampaignsTable
**File:** `src/components/campaigns/CampaignsTable.tsx`  
**Type:** Client component (uses hooks, fetches API)

**Props:**
```tsx
interface CampaignsTableProps {
  storeId: string;
}
```

**Behavior:**
- Fetches campaigns on mount and when `sortBy` changes
- Displays loading state while fetching
- Shows error message if fetch fails
- Renders summary cards with totals
- Table rows are clickable links to campaign detail pages
- Status badges color-coded by campaign state
- Metrics color-coded by performance (green = good, red = poor)

## Metrics & Formulas

All metrics calculated using functions from `src/lib/finance/formulas.ts`:

### Revenue ROAS
```
Revenue ROAS = Total Revenue / Total Ad Spend
```
- Estimate: store avg revenue per campaign
- Reality: requires UTM tracking per order

### Contribution ROAS
```
Contribution ROAS = (Revenue × Contribution Margin %) / Ad Spend
```
- Accounts for COGS and platform fees
- More conservative than revenue ROAS
- Green threshold: ≥ 1.0
- Red threshold: < 1.0

### Cost Per Action (CPA)
```
CPA = Total Ad Spend / Total Conversions
```
- Used to benchmark campaign efficiency
- Compare to "Max Sustainable CPA" for profitability

### Profitability Index
```
Profitability = Contribution Profit / Ad Spend
```
- Profit per $1 spent
- $1.10 = 10% return on ad spend
- $0.85 = 15% loss on ad spend

### Break-Even ROAS
```
Break-Even ROAS = 1 / Contribution Margin %
```
- Minimum ROAS to recover all costs (0% profit)
- Example: 50% margin → break-even = 2.0x ROAS

### Max Sustainable CPA
```
Max Sustainable CPA = (Contribution Profit per Order) × (1 - Safety Margin)
```
- Safety margin default: 20%
- Highest CPA that maintains profitability with buffer

## Revenue Attribution

**Current (MVP):**
- Spend-proportion heuristic
- Campaign revenue = store revenue × (campaign spend / total spend)
- Fast, no external tracking required
- Less accurate for multi-channel campaigns

**Future (Phase 2.1+):**
- UTM tracking: extract `utm_campaign` from Shopify order source
- Match UTM value to Meta campaign name
- Per-order attribution (accurate multi-touch)
- Requires Shopify pixel setup + order source tracking

**Setup UTM Tracking:**
1. In Meta Campaign settings, append UTM parameters:
   - `?utm_source=meta&utm_medium=paid&utm_campaign=campaign-name`
2. Ensure campaign name matches exactly
3. Run sync jobs to fetch updated campaign data
4. Revenue will be attributed to matching campaigns

## Future Enhancements

### Phase 2.1
- Real-time sync via Meta webhooks
- Retry logic for transient API failures
- Daily spend rollup to `DailyFinancialMetric`
- ROAS alerts when campaigns drop below threshold

### Phase 3
- Multi-account selection (user picks which Meta account to view)
- Google Ads integration + unified dashboard
- Audience insights (age, location, interests)
- A/B test comparison (campaign variants)
- Budget recommendations based on ROAS

### Phase 4+
- Automated pause/bid adjustment rules
- Predictive ROAS modeling
- Cross-platform attribution (Meta + Google + organic)
- Creative performance benchmarking
