# End-to-End Testing — Meta Ads Integration

## Overview

This document outlines how to test the complete Meta ads integration flow from OAuth connection through campaign analysis.

## Test Flow

```
1. OAuth Connection
   ├─ User clicks "Connect Meta Account"
   └─ Redirected to Meta for authorization

2. Token Storage & Setup
   ├─ Meta returns auth code
   ├─ Backend exchanges for access token
   ├─ Token encrypted and stored in MetaAccount
   └─ User redirected to integrations dashboard

3. Campaign Sync
   ├─ Sync job fetches campaigns from Meta Graph API
   ├─ Stores in MetaCampaign table
   ├─ Fetches 30-day daily insights
   └─ Stores in MetaSpendDaily table

4. Campaigns Display
   ├─ User navigates to /dashboard/meta/campaigns
   ├─ API fetches campaigns with calculated metrics
   └─ Table displays ROAS, profitability, CPA

5. Order Attribution (optional)
   ├─ User runs POST /api/campaigns/attribute
   ├─ Attribution service extracts utm_campaign from orders
   ├─ Matches to campaigns, creates OrderAttributionMeta records
   └─ Campaign revenue now reflects true attribution

6. Daily Spend Rollup (automatic)
   ├─ After sync completes, rollup aggregates MetaSpendDaily
   ├─ Calculates daily ROAS and contribution ROAS
   ├─ Updates DailyFinancialMetric for trending
   └─ Enables historical ROAS analysis
```

## Prerequisites

### Local Setup
```bash
# Install dependencies
npm install

# Copy .env.example to .env
cp .env.example .env

# Configure Meta app credentials
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"

# Generate random sync key
META_SYNC_API_KEY=$(openssl rand -hex 32)

# Configure database connection (Supabase)
DATABASE_URL="postgresql://...supabase..."
```

### Meta App Setup
1. Go to https://developers.facebook.com/
2. Create or select an app
3. Add Facebook Login product
4. Configure OAuth settings:
   - Valid OAuth Redirect URIs: `http://localhost:3000/api/meta/auth/callback`
   - App ID and Secret available in app settings
5. Request `ads_read` permission from Meta

### Test Shopify Store
- Use test store: `fe-multi-store-dev.myshopify.com`
- Already configured in `.env`
- Has sample products, orders, and customers

## Test Scenarios

### Scenario 1: OAuth Connection (Manual)

**Steps:**
1. Start dev server: `npm run dev`
2. Navigate to http://localhost:3000/dashboard/integrations
3. Click "Connect Meta" button
4. You'll be redirected to Meta login
5. Approve app permissions (ads_read)
6. Should redirect back with success message
7. MetaAccount record should appear in database

**Verify:**
```bash
# Check MetaAccount was created
psql $DATABASE_URL -c "SELECT * FROM MetaAccount WHERE storeId = 'your-store-id';"

# Check token is encrypted (not plaintext)
psql $DATABASE_URL -c "SELECT id, metaBusinessId, status FROM MetaAccount LIMIT 1;"
```

### Scenario 2: Campaign Sync (API)

**Manual Test:**
```bash
curl -X POST http://localhost:3000/api/meta/sync \
  -H "Authorization: Bearer $META_SYNC_API_KEY" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Meta sync completed",
  "summary": {
    "stores": 1,
    "datesProcessed": 5,
    "errors": 0
  }
}
```

**Verify in Database:**
```bash
# Check campaigns
psql $DATABASE_URL -c "SELECT id, name, status, totalSpend FROM MetaCampaign;"

# Check daily spend data
psql $DATABASE_URL -c "SELECT DATE(date), SUM(spend) FROM MetaSpendDaily GROUP BY DATE(date) ORDER BY date DESC LIMIT 7;"
```

### Scenario 3: Campaigns List UI

**Steps:**
1. Navigate to http://localhost:3000/dashboard/meta/campaigns
2. Verify summary cards display:
   - Total campaigns count
   - Total ad spend
   - Estimated revenue
   - Average contribution ROAS
3. Verify table columns:
   - Campaign name (clickable)
   - Status badge (color-coded)
   - Spend ($)
   - Impressions
   - Conversions
   - CPA
   - Contribution ROAS (green if ≥ 1.0)
   - Profitability ($ per $1 spent)

**Test Sorting:**
- Click "Spend" column header → should sort descending
- Click "Contrib ROAS" header → should sort by ROAS
- Click "Profitability" header → should sort by profitability index

**Test Campaign Link:**
- Click on campaign name → should navigate to `/dashboard/campaigns/[id]`

### Scenario 4: Campaign Detail Page

**Steps:**
1. From campaigns list, click on a campaign name
2. Verify campaign detail page shows:
   - Campaign name, objective, status
   - Key metrics: spend, revenue ROAS, contrib ROAS, CPA
   - Performance stats: conversions, CPM, profit per $1 spent
   - Efficiency benchmarks: break-even ROAS, max sustainable CPA
   - 30-day spend trend table (most recent 10 days)

**Test Navigation:**
- Click "← Back to Campaigns" → should return to campaigns list
- Verify all metrics match what's shown in the list table

### Scenario 5: Order Attribution (Optional)

**Prerequisites:**
- Shopify store with sample orders
- Orders should have utm_campaign parameters in source URL
- Set up UTM tracking on Meta campaigns first

**Steps:**
1. Ensure Meta campaigns are synced
2. Run attribution: 
   ```bash
   curl -X POST "http://localhost:3000/api/campaigns/attribute?storeId=store-id" \
     -H "Authorization: Bearer session-token"
   ```
3. Check response for attributed order count

**Verify in Database:**
```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM OrderAttributionMeta WHERE storeId = 'store-id';"
```

### Scenario 6: Daily Spend Rollup (Automatic)

**Trigger Manually:**
```bash
curl -X POST http://localhost:3000/api/meta/rollup \
  -H "Authorization: Bearer $META_SYNC_API_KEY" \
  -H "Content-Type: application/json"
```

**Verify Rollup:**
```bash
# Check DailyFinancialMetric was updated with Meta spend data
psql $DATABASE_URL -c "
  SELECT date, grossRevenue, cogs, contributionProfit 
  FROM DailyFinancialMetric 
  WHERE storeId = 'store-id'
  ORDER BY date DESC LIMIT 7;
"
```

## Unit Tests

Run test suite:
```bash
npm run test tests/meta-integration.test.ts
```

**Test Coverage:**
- OAuth token encryption/decryption
- Campaign data parsing
- Order attribution extraction
- ROAS calculations (revenue, contribution, break-even)
- CPA and profitability metrics
- Data validation and error handling

All tests should pass:
```
✓ Meta Ads Integration (10 tests)
  ✓ OAuth Token Handling
  ✓ Campaign Sync
  ✓ Order Attribution
  ✓ ROAS Calculation & Rollup
  ✓ Campaign Analytics
  ✓ Data Integrity
```

## Common Issues & Troubleshooting

### "Can't reach database server"
- Supabase instance not running
- DATABASE_URL missing or incorrect
- Network connectivity issue
- **Fix:** Verify Supabase URL in `.env`, check vpn/network

### "Unauthorized: No access to this store"
- User doesn't have store access in UserStoreAccess table
- JWT token expired
- **Fix:** Run as store owner or admin role

### "Campaign not found" during attribution
- utm_campaign value doesn't match any Meta campaign name
- Campaigns haven't been synced yet
- **Fix:** Run campaign sync first, verify utm_campaign parameter

### "Rate limit exceeded"
- Meta API rate limit hit
- **Fix:** Wait 15 minutes, try again (automatic retry in production)

### ROAS showing 0 or negative
- No revenue data for the day (orders not synced)
- COGS exceeds revenue
- **Fix:** Check DailyFinancialMetric has revenue, verify cost data

## Performance Expectations

| Operation | Time | Notes |
|-----------|------|-------|
| OAuth flow | 3-5s | Depends on Meta login |
| Campaign sync (5 campaigns, 30 days) | 10-15s | Includes API calls |
| Order attribution (100 orders) | 2-3s | DB query + matching |
| Spend rollup (90 days) | 5-10s | Multiple aggregates |
| Campaigns list load | <1s | Single DB query |
| Campaign detail load | <2s | Includes daily spend table |

## Production Deployment Checklist

- [ ] DATABASE_URL points to production Supabase
- [ ] META_APP_ID and META_APP_SECRET are production values
- [ ] META_SYNC_API_KEY is long random string (32+ chars)
- [ ] NEXT_PUBLIC_APP_URL matches your production domain
- [ ] pg_cron jobs scheduled in Supabase:
  - Campaign sync: every 4 hours
  - Spend rollup: daily at 2 AM UTC
- [ ] Webhook signature verification enabled
- [ ] Token encryption key is secure and backed up
- [ ] Audit logging enabled for compliance
- [ ] Monitoring/alerting set up for sync failures

## Next Steps (Phase 3+)

- [ ] Multi-account selection (view multiple Meta accounts)
- [ ] Google Ads integration (parallel tracking)
- [ ] Automated pause/bid recommendations
- [ ] Creative performance benchmarking
- [ ] Real-time webhook updates (vs 4-hour polling)
- [ ] Audience insights and segmentation
- [ ] Cross-channel attribution (Meta + Google + organic)
