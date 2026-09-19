-- CreateTable OrderAttributionMeta
CREATE TABLE "OrderAttributionMeta" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "utmCampaign" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "method" TEXT NOT NULL DEFAULT 'utm_exact',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAttributionMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderAttributionMeta_orderId_key" ON "OrderAttributionMeta"("orderId");

-- CreateIndex
CREATE INDEX "OrderAttributionMeta_storeId_idx" ON "OrderAttributionMeta"("storeId");

-- CreateIndex
CREATE INDEX "OrderAttributionMeta_metaCampaignId_idx" ON "OrderAttributionMeta"("metaCampaignId");

-- AddForeignKey
ALTER TABLE "OrderAttributionMeta" ADD CONSTRAINT "OrderAttributionMeta_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttributionMeta" ADD CONSTRAINT "OrderAttributionMeta_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAttributionMeta" ADD CONSTRAINT "OrderAttributionMeta_metaCampaignId_fkey" FOREIGN KEY ("metaCampaignId") REFERENCES "MetaCampaign"("id") ON DELETE CASCADE;
