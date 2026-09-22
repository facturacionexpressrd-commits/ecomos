ALTER TYPE "SupplierName" ADD VALUE IF NOT EXISTS 'cj';

CREATE TABLE "SupplierConnection" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "supplier" "SupplierName" NOT NULL,
  "apiKeyEncrypted" TEXT NOT NULL,
  "accessTokenEncrypted" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierConnection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierConnection_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SupplierConnection_organizationId_supplier_key"
  ON "SupplierConnection"("organizationId", "supplier");

CREATE TABLE "SupplierLink" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "supplier" "SupplierName" NOT NULL,
  "supplierVariantId" TEXT NOT NULL,
  "supplierSku" TEXT,
  "supplierName" TEXT,
  "cost" DECIMAL(12,2),
  "shippingCost" DECIMAL(12,2),
  "shippingMethod" TEXT,
  "shippingDays" TEXT,
  "fromCountryCode" TEXT,
  "availableQty" INTEGER,
  "lastSyncedAt" TIMESTAMP(3),
  "syncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SupplierLink_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SupplierLink_storeId_fkey" FOREIGN KEY ("storeId")
    REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SupplierLink_variantId_fkey" FOREIGN KEY ("variantId")
    REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SupplierLink_variantId_supplier_key" ON "SupplierLink"("variantId", "supplier");
CREATE INDEX "SupplierLink_storeId_idx" ON "SupplierLink"("storeId");

-- Same as the other enable_rls migrations: Prisma connects as the owner (bypasses RLS); this only
-- closes Supabase's public REST exposure. SupplierConnection holds encrypted supplier API keys.
ALTER TABLE "public"."SupplierConnection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupplierLink" ENABLE ROW LEVEL SECURITY;
