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

### 2. Prerequisites (all four, or the jobs just fail on a schedule)

pg_cron runs **inside Supabase**, not on your machine. Before scheduling anything:

1. **Migrations applied.** The sync queries `MetaAccount` / `MetaCampaign` /
   `MetaSpendDaily`. If those tables aren't in the target database, every run errors.
   Check with `\dt` or the dashboard before scheduling.
2. **A publicly reachable URL.** `localhost` and ephemeral tunnels are not targets
   Supabase can call. Deploy first, then use that origin.
3. **A real `META_SYNC_API_KEY`** on the deployed app — not the `.env` placeholder.
4. **Real `META_APP_ID` / `META_APP_SECRET`**, and at least one connected
   `MetaAccount` row. With zero connected accounts the job succeeds doing nothing.

### 3. Enable extensions

Use `pg_net` (async, Supabase's supported path), not `http`. The `http` extension's
`http_post` takes `(uri, content, content_type)` and has **no** header argument, so
bearer auth is impossible with it in a one-liner.

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 4. Store the key in Vault, not in the job body

`cron.job.command` is readable by anyone with database access. Keep the bearer token
out of it:

```sql
SELECT vault.create_secret('<your-real-sync-key>', 'meta_sync_api_key');
```

### 5. Schedule the jobs

```sql
-- Campaign sync, every 4 hours
SELECT cron.schedule(
  'meta-campaign-sync-4h',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR-DEPLOYED-DOMAIN/api/meta/sync',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (
                   SELECT decrypted_secret FROM vault.decrypted_secrets
                   WHERE name = 'meta_sync_api_key'
                 )
               ),
    body    := '{}'::jsonb
  );
  $$
);

-- Spend rollup, daily at 02:00 UTC — after the last sync of the day
SELECT cron.schedule(
  'meta-spend-rollup-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://YOUR-DEPLOYED-DOMAIN/api/meta/rollup',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || (
                   SELECT decrypted_secret FROM vault.decrypted_secrets
                   WHERE name = 'meta_sync_api_key'
                 )
               ),
    body    := '{}'::jsonb
  );
  $$
);
```

Note: `syncAllMetaAccounts()` already runs the rollup inline after each sync, so the
daily job is a backstop that repairs days a sync failed partway. Skip it if you'd
rather have one moving part.

### 6. Verify

```sql
SELECT jobid, jobname, schedule, active FROM cron.job;

-- Run outcomes (pg_cron only records that the statement ran)
SELECT jobid, status, return_message, start_time
FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;

-- The actual HTTP result lands here
SELECT id, status_code, content, created
FROM net._http_response ORDER BY created DESC LIMIT 10;
```

`cron.job_run_details` showing `succeeded` only means the SQL ran — a 401 or 500 from
the endpoint still shows as success there. Check `net._http_response` for the real
status.

To remove: `SELECT cron.unschedule('meta-campaign-sync-4h');`

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
- Check the extensions are enabled: `SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net');`
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
