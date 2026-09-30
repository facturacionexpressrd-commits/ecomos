# Shopify Public Distribution Submission Checklist

**Your app URL:** https://ecomos-omega.vercel.app

---

## Before you start
- [ ] You have access to Shopify Partner Dashboard
- [ ] You have admin access to the EcomOS app in Partner Dashboard
- [ ] You have a test dev store (NOT in `SHOPIFY_ALT_SHOPS`) to test on

---

## Step 1: Go to Distribution Settings
1. Open https://partners.shopify.com
2. Click **Apps** → **EcomOS**
3. Click **Distribution** (left sidebar)
4. Choose **Public distribution**

---

## Step 2: Fill in App Details

### App URL
- **App URL:** `https://ecomos-omega.vercel.app`
- **Redirect URL:** `https://ecomos-omega.vercel.app/api/shopify/callback`

### Compliance & Support
- **Compliance webhook URLs:**
  - `https://ecomos-omega.vercel.app/api/shopify/compliance/customers/data_request`
  - `https://ecomos-omega.vercel.app/api/shopify/compliance/customers/redact`
  - `https://ecomos-omega.vercel.app/api/shopify/compliance/shop/redact`

- **Emergency contact email:** your email
- **Support email:** your email

### Privacy & Terms
- **Privacy policy URL:** `https://ecomos-omega.vercel.app/privacy`
- **Terms of service URL:** `https://ecomos-omega.vercel.app/terms`

---

## Step 3: Request Protected Customer Data Access
1. Look for **Protected customer data** section
2. Click **Request access** → **Level 1**
3. Provide justifications (copy these exactly):
   - **Reason 1:** "Calculate per-order revenue, refunds and profit"
   - **Reason 2:** "Show customer order history to the merchant"
4. Submit

---

## Step 4: Request `read_all_orders` (Optional)
Only if merchants need order history older than 60 days.

1. Look for **Scopes** section
2. Request `read_all_orders`
3. Justification: "Merchants need to analyze historical margins and trends beyond the default 60-day window"

---

## Step 5: Test on Dev Store
1. Create a fresh test dev store in Partner Dashboard (NOT in `SHOPIFY_ALT_SHOPS`)
2. Install EcomOS on it
3. Verify:
   - [ ] OAuth flow works
   - [ ] App loads after install
   - [ ] Products sync
   - [ ] No console errors

---

## Step 6: Submit
1. Review all filled fields
2. Click **Submit for review**
3. Shopify will email you updates (usually 2–7 days)

---

## After Submission
- Check email for Shopify's response
- If they ask questions, respond promptly
- Once approved, the app is public and anyone can install it

---

## Listing Info (for when you add it to App Store later)
Don't need to do this now, but here's the copy:

- **Name:** EcomOS
- **Tagline:** Real profit per product, across every store and ad.
- **Description:** EcomOS pulls your orders, refunds, product costs and Meta ad spend into one dashboard, so you see true contribution profit per product and per variant, not just revenue.
- **Features:**
  - Profit and margin per variant from real orders, refunds, payment fees and your costs
  - CJ Dropshipping cost + stock sync and order forwarding
  - Meta Ads spend, ROAS and campaign controls next to your Shopify numbers
  - AI product copy and ad concepts from your catalog
  - Multi-store, multi-user with role-based access
