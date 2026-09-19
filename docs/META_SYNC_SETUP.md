# Meta Campaign Sync Setup

## Overview

The Meta sync job fetches campaign data every 4 hours from the Meta Graph API:
- Campaign metadata (name, status, objective, spend, impressions, conversions)
- Daily spend trends (last 30 days)
- Updates `MetaCampaign` and `MetaSpendDaily` tables
- Logs all activity to `AuditLog`

## Setup

### 1. Set Environment Variables

```bash
# Generate a random sync API key (32+ characters)
META_SYNC_API_KEY="your-random-secret-key-here"

# Meta OAuth credentials (from https://developers.facebook.com/apps)
META_APP_ID="your-app-id"
META_APP_SECRET="your-app-secret"
```

### 2. Create pg_cron Job in Supabase

In Supabase Dashboard → SQL Editor, run:

```sql
-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule Meta sync every 4 hours
SELECT cron.schedule(
  'meta-campaign-sync-4h',
  '0 */4 * * *', -- Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00 UTC)
  $$
  SELECT http_post(
    'https://your-domain.com/api/meta/sync',
    '{}',
    'application/json',
    jsonb_build_object('Authorization', 'Bearer YOUR_META_SYNC_API_KEY')
  ) as request_id;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Unschedule if needed
SELECT cron.unschedule('meta-campaign-sync-4h');
```

### 3. Enable http Extension

```sql
CREATE EXTENSION IF NOT EXISTS http;
```

## Manual Sync (for testing)

```bash
curl -X POST http://localhost:3000/api/meta/sync \
  -H "Authorization: Bearer YOUR_META_SYNC_API_KEY" \
  -H "Content-Type: application/json"
```

## Sync Flow

1. **Fetch connected accounts**: Query `MetaAccount` where status = 'connected'
2. **For each account**:
   - Decrypt access token (AES-256)
   - Fetch campaigns from Meta Graph API
   - Upsert campaign metadata to `MetaCampaign`
   - Fetch daily insights (last 30 days)
   - Upsert daily spend to `MetaSpendDaily`
3. **Log results** to `AuditLog` (campaigns created/updated, spend points, errors)
4. **Update status**: If errors, set `MetaAccount.status = 'error'`

## Error Handling

- Transient errors (network timeouts) are logged but don't fail the entire sync
- If a campaign fails, the sync continues with other campaigns
- Errors are recorded in the audit log for debugging
- If sync fails completely, `MetaAccount.status` is set to 'error'

## Monitoring

Check sync status:

```sql
-- Last sync for each account
SELECT 
  id, 
  metaBusinessId, 
  status, 
  lastSyncedAt 
FROM "MetaAccount" 
ORDER BY lastSyncedAt DESC;

-- Recent sync logs
SELECT 
  action, 
  metadata, 
  "createdAt" 
FROM "AuditLog" 
WHERE action = 'meta_sync_completed' 
ORDER BY "createdAt" DESC 
LIMIT 10;
```

## Troubleshooting

### Sync not running
- Check that http extension is enabled: `SELECT * FROM pg_extension WHERE extname = 'http';`
- Verify cron job exists: `SELECT * FROM cron.job;`
- Check Supabase function logs

### Token expired
- User will see `MetaAccount.status = 'error'`
- Reconnect Meta account via `/dashboard/integrations`
- New token will be fetched and encrypted

### API rate limits
- Meta Graph API has rate limits (usually not an issue with 4-hour sync)
- If hit, wait for reset and sync will retry next cycle

## Future Enhancements

- Retry logic for transient failures (Phase 2.1)
- Webhook support for real-time campaign updates (Phase 3)
- Multiple ad account selection (Phase 3)
- Daily spend rollup to `DailyFinancialMetric` for ROAS calculation (Phase 2.1)
