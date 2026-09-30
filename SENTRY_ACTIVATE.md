# Activate Sentry Error Monitoring — 5 Minutes

## Step 1: Create Sentry Project (2 min)

1. Go to https://sentry.io
2. **Sign up** (if needed) or log in
3. **Create Project** → Select **Next.js**
4. **Copy the DSN** (looks like: `https://abc123@def456.ingest.sentry.io/789`)

## Step 2: Add to Vercel Production (2 min)

```bash
# Option A: Via Vercel CLI (fastest)
vercel env add NEXT_PUBLIC_SENTRY_DSN production
# Paste: https://abc123@def456.ingest.sentry.io/789

vercel env add SENTRY_DSN production
# Paste: https://abc123@def456.ingest.sentry.io/789

vercel --prod --yes  # Deploy

# Option B: Via Vercel Dashboard
# 1. Go to: https://vercel.com/facturacionexpressrd-7513s-projects/ecomos/settings/environment-variables
# 2. Add two env vars above with your DSN
# 3. Redeploy
```

## Step 3: Verify (1 min)

After deployment:
1. Wait 2-5 minutes
2. Go to https://sentry.io → Your Project → Issues
3. If you see events: ✅ Active

## Done ✅

Sentry is now capturing all production errors. Configure alerts in Sentry dashboard if needed.
