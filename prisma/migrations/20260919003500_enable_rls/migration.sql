-- Supabase auto-exposes every public table over its REST API, gated only by RLS.
-- Our app never queries these tables through that path (Prisma connects directly
-- as the Postgres owner role, which bypasses RLS) — this enables RLS with no
-- policies purely to close the public anon-key REST exposure. See DATABASE.md.

ALTER TABLE "public"."Organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Role" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Store" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."UserStoreAccess" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."InventoryLevel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."WebhookEvent" ENABLE ROW LEVEL SECURITY;
