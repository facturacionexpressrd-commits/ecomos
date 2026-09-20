-- Adds order line items (revenue facts), refunds, payment ledger, and per-store fee estimate.
-- RLS is enabled with no policies, same reasoning as 20260919_enable_rls_finance_meta.
-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "paymentFeeFixed" DECIMAL(8,2) NOT NULL DEFAULT 0.30,
ADD COLUMN     "paymentFeePercent" DECIMAL(5,3) NOT NULL DEFAULT 2.9;

-- CreateTable
CREATE TABLE "OrderLineItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "shopifyGid" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopifyGid" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "refundedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundLine" (
    "id" TEXT NOT NULL,
    "refundId" TEXT NOT NULL,
    "lineItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "RefundLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "shopifyGid" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "gateway" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderLineItem_storeId_idx" ON "OrderLineItem"("storeId");

-- CreateIndex
CREATE INDEX "OrderLineItem_variantId_idx" ON "OrderLineItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderLineItem_orderId_shopifyGid_key" ON "OrderLineItem"("orderId", "shopifyGid");

-- CreateIndex
CREATE INDEX "Refund_orderId_idx" ON "Refund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_storeId_shopifyGid_key" ON "Refund"("storeId", "shopifyGid");

-- CreateIndex
CREATE INDEX "RefundLine_refundId_idx" ON "RefundLine"("refundId");

-- CreateIndex
CREATE INDEX "RefundLine_lineItemId_idx" ON "RefundLine"("lineItemId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_orderId_idx" ON "FinancialTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_storeId_shopifyGid_key" ON "FinancialTransaction"("storeId", "shopifyGid");

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineItem" ADD CONSTRAINT "OrderLineItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundLine" ADD CONSTRAINT "RefundLine_refundId_fkey" FOREIGN KEY ("refundId") REFERENCES "Refund"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundLine" ADD CONSTRAINT "RefundLine_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "OrderLineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "public"."OrderLineItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Refund" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."RefundLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FinancialTransaction" ENABLE ROW LEVEL SECURITY;
