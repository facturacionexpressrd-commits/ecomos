# Meta App Review Checklist

**Your app URL:** https://ecomos-omega.vercel.app

---

## Before you start
- [ ] You have a Meta/Facebook Business Account
- [ ] You have access to your Meta app in Developers Dashboard
- [ ] You've verified your business with Meta (upload company documents) — this is **required** before you can request permissions
- [ ] You have a test Meta ad account (sandbox account, not real)
- [ ] You have a Shopify dev store connected to EcomOS with some products

---

## Step 0: Verify Your Business (if not done)
**This is required before requesting permissions.**

1. Open https://business.facebook.com
2. Go **Settings → Business info**
3. Click **Start Verification**
4. Upload your company documents (legal name, ID, etc.)
5. Wait for approval (usually 24–48 hours)
6. Once approved, proceed to Step 1

---

## Step 1: Set Up App in Developers Dashboard

### App URL & Redirect
1. Open https://developers.facebook.com
2. Find your app
3. Click **Settings → Basic**
4. Set **App Domains:** `ecomos-omega.vercel.app`
5. Click **Add Platform → Website**
6. Set **Site URL:** `https://ecomos-omega.vercel.app`
7. Save

### OAuth Redirect URL
1. Go **Settings → Basic**
2. Under **OAuth Redirect URIs**, add:
   - `https://ecomos-omega.vercel.app/api/meta/auth/callback`
3. Save

### Privacy & App Info
1. Go to your app settings
2. Set **Privacy Policy URL:** `https://ecomos-omega.vercel.app/privacy`
3. Set **Data Deletion URL:** `https://ecomos-omega.vercel.app/data-deletion`
4. Set **Category:** Business
5. Upload **App Icon** (1024×1024 PNG) — use your EcomOS logo

---

## Step 2: Request Permissions

1. Open https://developers.facebook.com → your app
2. Click **App Review → Permissions and features**
3. Click **Request access** for each:

### Permission 1: `ads_read`
- **Use case:** "EcomOS reads the merchant's campaigns and daily insights (spend, impressions, clicks, purchases) to show ad spend and ROAS next to their Shopify revenue and calculate true profit."
- Submit

### Permission 2: `ads_management`
- **Use case:** "Merchants create campaigns (always created PAUSED, after a mandatory review screen), and pause, activate or duplicate their own campaigns from EcomOS. Every action is audit-logged and only runs on ad accounts the merchant connected."
- Submit

---

## Step 3: Record Screencasts

You need **two videos** (one per permission). Each ~2 minutes, English UI, no cuts, no editing jumps.

### Setup
1. Use OBS, ScreenFlow, or built-in screen recorder
2. Resolution: 1920×1080 or higher
3. Zoom: 100% (no browser zoom)
4. Show your entire desktop/app during login (so they see you're not cutting)

### Video 1: `ads_read` Permission Demo

**Script (2 minutes):**

1. **Login screen (0:00–0:15)**
   - Show the login page: https://ecomos-omega.vercel.app/login
   - Type your test email and password
   - Click Sign In
   - Wait for dashboard to load

2. **Navigate to Integrations (0:15–0:30)**
   - Click **Integrations** (top nav or sidebar)
   - Show the page with "Connect Meta Ads" button

3. **Start Meta connection (0:30–0:50)**
   - Click **Connect Meta Ads**
   - The Facebook login dialog appears
   - Show that both permissions are requested: `ads_read` and `ads_management`
   - Click **Continue**
   - Authenticate with your Meta test account

4. **Select ad account (0:50–1:05)**
   - After login, you'll see a list of ad accounts
   - Click to select your sandbox ad account
   - Wait for page to show "Connected"

5. **View campaigns (1:05–1:45)**
   - Navigate to **Campaigns** (or Ad Account page)
   - Show the campaigns list with columns: Campaign name, Spend, ROAS
   - Click on one campaign to open details
   - Show the **Daily Insights chart** (spend over time, impressions, etc.)
   - Scroll through to show data is visible

6. **Disconnect (1:45–2:00)**
   - Go back to **Integrations**
   - Click **Disconnect Meta**
   - Confirm the disconnection

**File:** Save as `ecomos_ads_read_demo.mp4`

---

### Video 2: `ads_management` Permission Demo

**Script (2 minutes):**

1. **Login (0:00–0:20)**
   - Same login as Video 1
   - Show authentication

2. **Navigate to Campaigns (0:20–0:40)**
   - Click **Campaigns** in the main nav
   - Show existing campaigns list

3. **Create a campaign (0:40–1:20)**
   - Click **New Campaign** or **Create Campaign**
   - Fill in test campaign details:
     - **Name:** "Test Campaign — Review"
     - **Objective:** Select one (e.g., "Traffic" or "Conversions")
     - **Budget:** $10/day
     - **Audience:** Show audience settings
   - Click **Next** or **Review**

4. **Review screen (1:20–1:40)**
   - Show the **review/approval screen** with checkboxes
   - Check any required boxes
   - Click **Create Campaign**
   - Wait for confirmation message

5. **Verify in Meta Ads Manager (1:40–2:00)**
   - Open Meta Ads Manager (new tab: https://business.facebook.com/adsmanager)
   - Log in if needed
   - Show your new campaign in the list
   - **Verify it's PAUSED** (show the status)

**File:** Save as `ecomos_ads_management_demo.mp4`

---

## Step 4: Submit Videos & Test Credentials

1. In **App Review → Permissions and features**, find each permission request
2. For each permission, upload the corresponding video
3. In the **Instructions for reviewers** field, add:

```
Test account credentials:
Email: [your test email]
Password: [your test password]

Test Meta ad account ID: [your sandbox ad account ID]

The test account has a connected Shopify dev store with sample products.
```

---

## Step 5: Submit for Review

1. Review everything one more time
2. Click **Submit for Review** for both permissions
3. Meta will email you updates (usually 3–5 days, sometimes longer)

---

## After Submission
- Meta may ask follow-up questions — respond quickly
- Once approved, your app can request these permissions from real users
- Test the full flow: new user → Meta connect → campaigns → manage
