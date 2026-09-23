-- Per-resource watermarks for incremental Shopify sync. NULL means "never synced": the next
-- sync of that resource fetches everything, exactly as before (so the first run after this
-- migration is a full sync, which also fills ProductVariant.inventoryItemGid below).
ALTER TABLE "Store" ADD COLUMN "customersSyncedAt" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN "productsSyncedAt" TIMESTAMP(3);
ALTER TABLE "Store" ADD COLUMN "ordersSyncedAt" TIMESTAMP(3);

-- Lets an inventory_levels/update webhook update stock directly instead of triggering a sync.
ALTER TABLE "ProductVariant" ADD COLUMN "inventoryItemGid" TEXT;
CREATE INDEX "ProductVariant_storeId_inventoryItemGid_idx" ON "ProductVariant"("storeId", "inventoryItemGid");
