# Sentry Error Monitoring Setup

## Overview
Sentry is configured in the project to catch and monitor all production errors. When activated, it will:
- Capture all unhandled exceptions
- Track performance issues
- Record user sessions on errors (production: 1% sample)
- Send alerts for critical errors

## Setup Instructions

### 1. Create Sentry Account
1. Go to https://sentry.io
2. Sign up or log in
3. Create a new project → Select "Next.js"
4. Copy your **DSN** (looks like: `https://xxx@yyy.ingest.sentry.io/zzz`)

### 2. Add Environment Variables to Vercel

**Production Environment:**
- `SENTRY_DSN` = `https://xxx@yyy.ingest.sentry.io/zzz` (server-side)
- `NEXT_PUBLIC_SENTRY_DSN` = `https://xxx@yyy.ingest.sentry.io/zzz` (client-side)

**Steps:**
1. Go to Vercel: https://vercel.com/facturacionexpressrd-7513s-projects/ecomos/settings/environment-variables
2. Add both environment variables
3. Save and redeploy

### 3. Verify Installation

After deployment:
1. Go to Sentry dashboard → your project
2. Look for incoming events (may take 1-5 minutes to appear)
3. Errors will automatically appear in the "Issues" tab

## Usage in Code

### Automatic Catching
All unhandled errors are automatically captured. No code changes needed.

### Manual Capturing
```typescript
import { captureException, captureMessage } from "@/sentry.client.config";

// Capture an error
try {
  // some code
} catch (error) {
  captureException(error as Error, { feature: "checkout" });
}

// Capture a message
captureMessage("User completed checkout", "info");
```

## Testing

To test error tracking in production:
1. Add a debug endpoint:
```typescript
export async function GET() {
  throw new Error("Test error from EcomOS");
}
```
2. Trigger it and watch Sentry dashboard

## Configuration

- **Server DSN** (`SENTRY_DSN`) - Catches backend errors
- **Client DSN** (`NEXT_PUBLIC_SENTRY_DSN`) - Catches frontend errors
- **Sample Rate** - 10% in production, 100% in development (adjust if needed)
- **Replay Sample Rate** - 1% in production (session replay on errors)

## Alerts

Once active, configure Sentry alerts:
1. Sentry → Alerts
2. Create rule: "When {any} event is {seen}"
3. Action: "Send a notification via Email"
4. Add your email

## Cost

Sentry free tier includes:
- 5,000 events/month
- Unlimited team members
- 30-day data retention

For higher volume, consider a paid plan.
