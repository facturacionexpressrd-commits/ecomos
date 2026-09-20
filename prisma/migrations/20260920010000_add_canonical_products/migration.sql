-- Canonical products and supplier offers
-- Decouples product identity from any single store or supplier
-- CreateEnum
CREATE TYPE "SupplierName" AS ENUM ('autods', 'spocket', 'printful', 'zendrop');

-- CreateEnum
CREATE TYPE "ApprovalActionType" AS ENUM ('supplier_switch', 'inventory_adjustment', 'pricing_override');

-- CreateTable
CREATE TABLE "CanonicalProduct" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "sku" TEXT,
    "barcode" TEXT,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOffer" (
    "id" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "supplier" "SupplierName" NOT NULL,
    "supplierProductId" TEXT,
    "cost" DECIMAL(12,2) NOT NULL,
    "shippingCost" DECIMAL(12,2) NOT NULL,
    "shippingDays" INTEGER NOT NULL,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "shopifyProductId" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "mappedBy" TEXT,
    "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalAction" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "actionType" "ApprovalActionType" NOT NULL,
    "fromSupplier" "SupplierName",
    "toSupplier" "SupplierName",
    "requestedBy" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "reason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "ApprovalAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CanonicalProduct_externalId_idx" ON "CanonicalProduct"("externalId");

-- CreateIndex
CREATE INDEX "CanonicalProduct_sku_idx" ON "CanonicalProduct"("sku");

-- CreateIndex
CREATE INDEX "CanonicalProduct_barcode_idx" ON "CanonicalProduct"("barcode");

-- CreateIndex
CREATE INDEX "SupplierOffer_supplier_idx" ON "SupplierOffer"("supplier");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierOffer_canonicalProductId_supplier_key" ON "SupplierOffer"("canonicalProductId", "supplier");

-- CreateIndex
CREATE INDEX "ProductMapping_canonicalProductId_idx" ON "ProductMapping"("canonicalProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_storeId_shopifyProductId_key" ON "ProductMapping"("storeId", "shopifyProductId");

-- CreateIndex
CREATE INDEX "ApprovalAction_storeId_status_idx" ON "ApprovalAction"("storeId", "status");

-- CreateIndex
CREATE INDEX "ApprovalAction_canonicalProductId_idx" ON "ApprovalAction"("canonicalProductId");

-- AddForeignKey
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalAction" ADD CONSTRAINT "ApprovalAction_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable RLS on new tables (no policies yet, just block public anon access)
ALTER TABLE "public"."CanonicalProduct" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."SupplierOffer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProductMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ApprovalAction" ENABLE ROW LEVEL SECURITY;
