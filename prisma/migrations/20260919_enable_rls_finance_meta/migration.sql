-- Same reasoning as 20260919003500_enable_rls: Supabase auto-exposes every public
-- table over its REST API, gated only by RLS. The app reaches these through Prisma
-- as the Postgres owner role, which bypasses RLS, so this enables RLS with no
-- policies purely to close the public anon-key REST exposure. See DATABASE.md.
--
-- The finance and Meta migrations create tables but do not enable RLS, so without
-- this they land publicly readable. MetaAccount is the urgent one — it stores
-- encrypted OAuth access tokens.

ALTER TABLE "public"."CostAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."DailyFinancialMetric" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MetaAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MetaCampaign" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."MetaSpendDaily" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."OrderAttributionMeta" ENABLE ROW LEVEL SECURITY;
