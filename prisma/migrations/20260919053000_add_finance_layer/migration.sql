-- Add cost field to ProductVariant
ALTER TABLE "ProductVariant" ADD COLUMN "cost" NUMERIC(12, 2);

-- CreateTable CostAllocation
CREATE TABLE "CostAllocation" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "costType" TEXT NOT NULL,
    "amount" NUMERIC(12, 2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable DailyFinancialMetric
CREATE TABLE "DailyFinancialMetric" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "grossRevenue" NUMERIC(12, 2) NOT NULL,
    "refunds" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "fees" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "cogs" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "contributionProfit" NUMERIC(12, 2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyFinancialMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostAllocation_storeId_idx" ON "CostAllocation"("storeId");

-- CreateIndex
CREATE INDEX "CostAllocation_variantId_idx" ON "CostAllocation"("variantId");

-- CreateIndex
CREATE INDEX "DailyFinancialMetric_storeId_idx" ON "DailyFinancialMetric"("storeId");

-- CreateIndex
CREATE INDEX "DailyFinancialMetric_storeId_date_idx" ON "DailyFinancialMetric"("storeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyFinancialMetric_storeId_date_key" ON "DailyFinancialMetric"("storeId", "date");

-- AddForeignKey
ALTER TABLE "CostAllocation" ADD CONSTRAINT "CostAllocation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAllocation" ADD CONSTRAINT "CostAllocation_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyFinancialMetric" ADD CONSTRAINT "DailyFinancialMetric_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE;
