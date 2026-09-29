-- Covering indexes for the 13 foreign keys flagged by Supabase performance advisor.
-- Idempotent (IF NOT EXISTS) so re-runs are safe. Applied directly to prod
-- 2026-09-29 via Supabase migration; this file version-controls that change.

CREATE INDEX IF NOT EXISTS "AuditLog_storeId_idx" ON public."AuditLog" ("storeId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_idx" ON public."AuditLog" ("userId");
CREATE INDEX IF NOT EXISTS "CreativeAsset_creativeIdeaId_idx" ON public."CreativeAsset" ("creativeIdeaId");
CREATE INDEX IF NOT EXISTS "CreativeIdea_productId_idx" ON public."CreativeIdea" ("productId");
CREATE INDEX IF NOT EXISTS "InventoryLevel_storeId_idx" ON public."InventoryLevel" ("storeId");
CREATE INDEX IF NOT EXISTS "Invitation_roleId_idx" ON public."Invitation" ("roleId");
CREATE INDEX IF NOT EXISTS "Invitation_storeId_idx" ON public."Invitation" ("storeId");
CREATE INDEX IF NOT EXISTS "MetaCreative_storeId_idx" ON public."MetaCreative" ("storeId");
CREATE INDEX IF NOT EXISTS "Notification_storeId_idx" ON public."Notification" ("storeId");
CREATE INDEX IF NOT EXISTS "NotificationPreferences_storeId_idx" ON public."NotificationPreferences" ("storeId");
CREATE INDEX IF NOT EXISTS "Order_customerId_idx" ON public."Order" ("customerId");
CREATE INDEX IF NOT EXISTS "ProductAICopy_productId_idx" ON public."ProductAICopy" ("productId");
CREATE INDEX IF NOT EXISTS "UserStoreAccess_roleId_idx" ON public."UserStoreAccess" ("roleId");
