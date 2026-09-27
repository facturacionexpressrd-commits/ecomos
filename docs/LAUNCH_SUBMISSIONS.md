# Launch submissions: Shopify public app + Meta App Review

Both reviews take days to weeks, so start them early. `<APP_URL>` = production URL (`NEXT_PUBLIC_APP_URL`).

---

## 1. Shopify: public distribution

Today stores outside `SHOPIFY_ALT_SHOPS` can only install the main app if it is public. Partner
Dashboard → Apps → EcomOS → **Distribution → Public distribution** (unlisted is fine to start; the
App Store listing can come later).

### Already in place (verify, don't rebuild)
- [x] OAuth install + HMAC-verified callback (`/api/shopify/install`, `/api/shopify/callback`)
- [x] Mandatory GDPR webhooks: `customers/data_request`, `customers/redact`, `shop/redact`
      (`/api/shopify/compliance/*`)
- [x] Webhook HMAC verification + idempotency
- [x] Privacy policy `<APP_URL>/privacy`, terms `<APP_URL>/terms`
- [x] Read-only scopes: `read_products,read_orders,read_customers,read_inventory`

### To do in the Partner Dashboard
- [ ] App URL: `<APP_URL>`; redirect URL: `<APP_URL>/api/shopify/callback`
- [ ] Compliance webhook URLs → the three `/api/shopify/compliance/*` routes
- [ ] **Protected customer data**: request Level 1 access (we read orders + customers). Reasons:
      "calculate per-order revenue, refunds and profit" and "show customer order history to the merchant"
- [ ] `read_all_orders` if merchants need history older than 60 days (needs its own justification)
- [ ] Emergency contact email + support email (`COMPLIANCE_CONTACT_EMAIL`)
- [ ] Test on a fresh dev store that is **not** in `SHOPIFY_ALT_SHOPS`

### Listing copy (for when it goes on the App Store)
- **Name:** EcomOS
- **Tagline (≤62 chars):** Real profit per product, across every store and ad.
- **Intro:** EcomOS pulls your orders, refunds, product costs and Meta ad spend into one
  dashboard, so you see true contribution profit per product and per variant, not just revenue.
- **Features:**
  - Profit and margin per variant from real orders, refunds, payment fees and your costs
  - CJ Dropshipping cost + stock sync and order forwarding
  - Meta Ads spend, ROAS and campaign controls next to your Shopify numbers
  - AI product copy and ad concepts from your catalog
  - Multi-store, multi-user with role-based access

---

## 2. Meta: App Review

Until approved, only app admins/testers can connect ad accounts. developers.facebook.com → App →
**App Review → Permissions and features**. Requires Business Verification first.

### Permissions to request
| Permission | Used for (paste as justification) |
|---|---|
| `ads_read` | "EcomOS reads the merchant's campaigns and daily insights (spend, impressions, clicks, purchases) to show ad spend and ROAS next to their Shopify revenue and calculate true profit." |
| `ads_management` | "Merchants create campaigns (always created PAUSED, after a mandatory review screen), and pause, activate or duplicate their own campaigns from EcomOS. Every action is audit-logged and only runs on ad accounts the merchant connected." |

Also set: privacy policy `<APP_URL>/privacy`, data deletion URL `<APP_URL>/data-deletion`,
OAuth redirect `<APP_URL>/api/meta/auth/callback`, app icon 1024×1024, category Business.

### Screencast script (one video per permission, ~2 min, English UI, no cuts in the login)
1. Log in to EcomOS at `<APP_URL>/login`.
2. Integrations → **Connect Meta Ads** → Facebook login dialog → show both permissions → Continue.
3. Pick the ad account → back in EcomOS showing "Connected".
4. **ads_read:** Campaigns page → campaigns list with spend/ROAS → open one → daily insights chart.
5. **ads_management:** Campaigns → **New campaign** → fill name/objective/audience/budget →
   review screen with approval checkboxes → create → show it in Ads Manager as **Paused**.
   Then ⋯ → Pause / Activate on an existing campaign, and show the change in Ads Manager.
6. Integrations → Disconnect Meta (shows the merchant can revoke).

### Test user for reviewers
Give Meta a login to a demo workspace with a connected dev store and a sandbox ad account, and
put the credentials in the "Instructions for reviewers" field. Don't use a real customer's account.
