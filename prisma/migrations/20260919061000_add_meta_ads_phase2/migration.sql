-- CreateEnum MetaStatus
CREATE TYPE "MetaStatus" AS ENUM ('connected', 'disconnected', 'expired', 'error');

-- CreateTable MetaAccount
CREATE TABLE "MetaAccount" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "metaBusinessId" TEXT NOT NULL,
    "metaAccountId" TEXT NOT NULL,
    "accessTokenEncrypted" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" "MetaStatus" NOT NULL DEFAULT 'connected',
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable MetaCampaign
CREATE TABLE "MetaCampaign" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "metaAccountId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "totalSpend" NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable MetaSpendDaily
CREATE TABLE "MetaSpendDaily" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "metaCampaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend" NUMERIC(12, 2) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaSpendDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex MetaAccount
CREATE UNIQUE INDEX "MetaAccount_metaBusinessId_key" ON "MetaAccount"("metaBusinessId");
CREATE UNIQUE INDEX "MetaAccount_metaAccountId_key" ON "MetaAccount"("metaAccountId");
CREATE INDEX "MetaAccount_storeId_idx" ON "MetaAccount"("storeId");

-- CreateIndex MetaCampaign
CREATE UNIQUE INDEX "MetaCampaign_storeId_metaCampaignId_key" ON "MetaCampaign"("storeId", "metaCampaignId");
CREATE INDEX "MetaCampaign_storeId_idx" ON "MetaCampaign"("storeId");
CREATE INDEX "MetaCampaign_metaAccountId_idx" ON "MetaCampaign"("metaAccountId");

-- CreateIndex MetaSpendDaily
CREATE UNIQUE INDEX "MetaSpendDaily_metaCampaignId_date_key" ON "MetaSpendDaily"("metaCampaignId", "date");
CREATE INDEX "MetaSpendDaily_storeId_date_idx" ON "MetaSpendDaily"("storeId", "date");
CREATE INDEX "MetaSpendDaily_metaCampaignId_idx" ON "MetaSpendDaily"("metaCampaignId");

-- AddForeignKey
ALTER TABLE "MetaAccount" ADD CONSTRAINT "MetaAccount_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaCampaign" ADD CONSTRAINT "MetaCampaign_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaCampaign" ADD CONSTRAINT "MetaCampaign_metaAccountId_fkey" FOREIGN KEY ("metaAccountId") REFERENCES "MetaAccount"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaSpendDaily" ADD CONSTRAINT "MetaSpendDaily_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "MetaSpendDaily" ADD CONSTRAINT "MetaSpendDaily_metaCampaignId_fkey" FOREIGN KEY ("metaCampaignId") REFERENCES "MetaCampaign"("id") ON DELETE CASCADE;
