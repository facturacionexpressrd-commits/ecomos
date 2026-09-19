# EcomOS Database Schema

## Core Tables

### Organization
```sql
CREATE TABLE organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### User
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Role (enum-like)
```
Owner, Admin, Manager, Analyst, Member
```

### OrganizationMember
```sql
CREATE TABLE organization_members (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- Owner, Admin, Manager, Analyst, Member
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

### Store (Shopify connection)
```sql
CREATE TABLE stores (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  shopify_domain VARCHAR(255) UNIQUE NOT NULL, -- mystore.myshopify.com
  shopify_access_token VARCHAR(255) NOT NULL, -- encrypted
  shopify_api_version VARCHAR(50) NOT NULL, -- 2024-01
  webhook_secret VARCHAR(255),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### UserStoreAccess
```sql
CREATE TABLE user_store_access (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, store_id)
);
```

### Product (from Shopify)
```sql
CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_id VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  handle VARCHAR(255),
  body_html TEXT,
  vendor VARCHAR(255),
  product_type VARCHAR(255),
  status VARCHAR(50), -- active, draft, archived
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, shopify_id)
);
```

### Variant
```sql
CREATE TABLE variants (
  id BIGSERIAL PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shopify_id VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  sku VARCHAR(255),
  position INT,
  price DECIMAL(10, 2),
  cost DECIMAL(10, 2), -- manual entry for Phase 1+
  weight DECIMAL(10, 2),
  weight_unit VARCHAR(10),
  inventory_qty INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, shopify_id)
);
```

### InventoryLevel
```sql
CREATE TABLE inventory_levels (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
  location_id VARCHAR(255), -- Shopify location ID
  available INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Customer (from Shopify)
```sql
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  shopify_id VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(20),
  total_spent DECIMAL(12, 2),
  order_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, shopify_id)
);
```

### Order (from Shopify)
```sql
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id BIGINT REFERENCES customers(id) ON DELETE SET NULL,
  shopify_id VARCHAR(255) NOT NULL,
  order_number INT,
  email VARCHAR(255),
  currency VARCHAR(3),
  total_price DECIMAL(12, 2),
  subtotal_price DECIMAL(12, 2),
  total_tax DECIMAL(12, 2),
  total_shipping DECIMAL(12, 2),
  financial_status VARCHAR(50), -- authorized, pending, paid, refunded, voided, partially_refunded
  fulfillment_status VARCHAR(50), -- fulfilled, partial, unconfirmed, in_progress, on_hold, scheduled, cancelled
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, shopify_id)
);
```

### OrderLineItem
```sql
CREATE TABLE order_line_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id BIGINT REFERENCES variants(id) ON DELETE SET NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2),
  title VARCHAR(255)
);
```

### AuditLog (immutable)
```sql
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  store_id BIGINT REFERENCES stores(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL, -- store_connected, product_synced, order_synced, user_invited, etc.
  resource_type VARCHAR(255), -- Store, Product, Order, User
  resource_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_organization ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_store ON audit_logs(store_id);
```

## Financial Tables (Phase 1.5+, stubbed)

```sql
CREATE TABLE financial_transactions (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id),
  order_id BIGINT REFERENCES orders(id),
  type VARCHAR(50), -- sale, refund, fee, adjustment
  amount DECIMAL(12, 2),
  currency VARCHAR(3),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cost_allocations (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES variants(id),
  cost_type VARCHAR(50), -- cogs, packaging, shipping
  amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE daily_financial_metrics (
  id BIGSERIAL PRIMARY KEY,
  store_id BIGINT NOT NULL REFERENCES stores(id),
  date DATE NOT NULL,
  gross_revenue DECIMAL(12, 2),
  refunds DECIMAL(12, 2),
  cogs DECIMAL(12, 2),
  fees DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(store_id, date)
);
```

## Indexes for Performance

```sql
CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_variants_product ON variants(product_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_user_store_access_user ON user_store_access(user_id);
CREATE INDEX idx_user_store_access_store ON user_store_access(store_id);
CREATE INDEX idx_organization_members_user ON organization_members(user_id);
CREATE INDEX idx_organization_members_org ON organization_members(organization_id);
```

## Row-Level Security (RLS) Rules

**Principle:** Users can only see data for stores they have access to.

```sql
-- On products, variants, orders, customers, inventory_levels:
-- Users see rows where store_id IN (user's accessible stores)
```

Implementation handled by application-level queries (Prisma filters) in Phase 0.
RLS policies added in Phase 2 as secondary guard.
