# EcomOS Integrations & APIs

## Shopify GraphQL Admin API

**Base URL:** `https://{shop}.myshopify.com/admin/api/{version}/graphql.json`

**Authentication:**
- Custom App access token in Authorization header
- Token stored encrypted in `stores.shopify_access_token`

**Required Scopes:**
- `write_products`, `read_products`
- `write_orders`, `read_orders`
- `write_inventory`, `read_inventory`
- `write_customers`, `read_customers`
- `write_webhooks`, `read_webhooks`

### Sync Operations

#### Products & Variants Sync
```graphql
query SyncProducts($first: Int, $after: String) {
  products(first: $first, after: $after, sortKey: UPDATED_AT) {
    edges {
      node {
        id
        title
        handle
        bodyHtml
        vendor
        productType
        status
        publishedAt
        variants(first: 250) {
          edges {
            node {
              id
              title
              sku
              price
              weight
            }
          }
        }
      }
    }
  }
}
```

#### Orders Sync
```graphql
query SyncOrders($first: Int, $after: String) {
  orders(first: $first, after: $after, sortKey: UPDATED_AT) {
    edges {
      node {
        id
        orderNumber
        email
        currencyCode
        totalPriceSet { shopMoney { amount } }
        subtotalPriceSet { shopMoney { amount } }
        totalTaxSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }
        financialStatus
        fulfillmentStatus
        customer { id email }
        lineItems(first: 250) {
          edges {
            node {
              id
              quantity
              originalUnitPriceSet { shopMoney { amount } }
              variant { id sku }
            }
          }
        }
      }
    }
  }
}
```

#### Inventory Levels
```graphql
query InventoryLevels($first: Int, $after: String) {
  inventoryLevels(first: $first, after: $after) {
    edges {
      node {
        id
        available
        location { id }
        item { variant { id } }
      }
    }
  }
}
```

## Webhook Events

**Endpoint:** `POST /api/webhooks/shopify`

**Signature Verification:**
1. Extract `X-Shopify-Hmac-SHA256` header
2. Compute HMAC-SHA256 of raw body with store webhook secret
3. Base64-encode and compare to header value

### Subscribed Topics

| Topic | Action |
|-------|--------|
| `products/update` | Sync product/variants to DB |
| `products/delete` | Mark product as deleted |
| `orders/create` | Sync new order + customer |
| `orders/updated` | Update order status + financials |
| `inventory_levels/update` | Update stock in DB |

**Example Webhook Payload:**
```json
{
  "id": 12345,
  "product_id": 67890,
  "created_at": "2024-01-01T12:00:00Z",
  "updated_at": "2024-01-02T12:00:00Z",
  "title": "Blue Widget"
}
```

## Supabase Auth Integration

**Endpoints:**
- Sign up: `https://{project}.supabase.co/auth/v1/signup`
- Login: `https://{project}.supabase.co/auth/v1/token?grant_type=password`
- Session verification: via JWT in httpOnly cookie

**OAuth Providers:**
- Google (optional, Phase 1+)

**Session Management:**
- JWT stored in httpOnly cookie (`session`)
- Refresh token stored securely
- Session validation on every API request

## Background Job Scheduling

**Service:** Supabase pg_cron (or Vercel Crons in production)

**Scheduled Tasks:**

| Job | Schedule | Action |
|-----|----------|--------|
| sync_products | 02:00 UTC daily | Full product sync from Shopify |
| sync_orders | Every 4 hours | Fetch new/updated orders |
| sync_inventory | Every 1 hour | Reconcile inventory levels |

**Job Result Tracking:**
- Success/failure logged to AuditLog
- Retry logic: 3 attempts with exponential backoff
- Alerts on repeated failures (stub for Phase 2)

## API Response Format

**Success:**
```json
{
  "ok": true,
  "data": { /* response */ }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "User does not have access to this store"
  }
}
```

## Rate Limits

**Shopify GraphQL API:**
- 2000 points per minute (burst: 100 points)
- Mutation-heavy operations deplete faster
- Backoff: wait until X-Shopify-Graphql-Resource-Consumed header reaches <1000

**Application:**
- 100 requests/minute per user per store (Phase 2+)
- Webhook delivery: best-effort, retry up to 5 times over 48 hours

## Meta Marketing API (Ads Manage)

**Base URL:** `https://graph.facebook.com/{version}/`

**Authentication:**
- OAuth access token in request params or Authorization header
- Token stored encrypted in `metaAccounts.accessTokenEncrypted`
- Requires scope: `ads_read,ads_manage` (write actions require `ads_manage`)

**Campaign Creation:**
```
POST /{ad_account_id}/campaigns
- name: string
- objective: string (LINK_CLICKS, CONVERSIONS, etc.)
- status: string (ACTIVE, PAUSED)
- special_ad_categories: array (if applicable)
Returns: { campaign_id }
```

**Ad Set Creation:**
```
POST /{ad_account_id}/adsets
- name: string
- campaign_id: string
- daily_budget or lifetime_budget: number (in cents)
- billing_event: string
- optimization_goal: string
- targeting: object
- start_time: timestamp (optional)
- end_time: timestamp (optional)
Returns: { adset_id }
```

**Ad Creation:**
```
POST /{ad_account_id}/ads
- name: string
- adset_id: string
- creative: object { asset_id or ... }
- status: string
Returns: { ad_id }
```

**Campaign Update (budget, status, name):**
```
POST /{campaign_id}
- name: string (optional)
- status: string (ACTIVE, PAUSED, DELETED)
Returns: { success }
```

**Ad Set Budget Update:**
```
POST /{adset_id}
- daily_budget: number (optional, in cents)
- lifetime_budget: number (optional, in cents)
- start_time: timestamp (optional)
- end_time: timestamp (optional)
Returns: { success }
```

### Campaign Wizard Endpoints (EcomOS)

**POST /api/meta/campaigns/draft** — Save wizard state
- storeId, campaignName, objective, budget, targeting, creativeAssets
- Returns: draftId

**POST /api/meta/campaigns/create** — Create and publish campaign
- storeId, draftId or full campaign object
- Review screen presented before this is called
- Returns: { campaignId, syncedAt }

**POST /api/meta/campaigns/{id}/pause**
**POST /api/meta/campaigns/{id}/activate**
**POST /api/meta/campaigns/{id}/duplicate**
**PATCH /api/meta/campaigns/{id}/budget**
- All require user authorization + audit logging

## Data Encryption

**Sensitive Fields:**
- `stores.shopify_access_token` — encrypted with Supabase vault or application-level AES-256
- `metaAccounts.accessTokenEncrypted` — AES-256-GCM with IV + auth tag
- `users.password` — handled by Supabase Auth (bcrypt)

**Implementation:** Use Prisma middlewares or Supabase vault feature for token encryption.
