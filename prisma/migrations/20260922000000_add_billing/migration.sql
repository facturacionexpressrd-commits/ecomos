ALTER TABLE "Organization" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "Organization" ADD COLUMN "currentPeriodEnd" TIMESTAMP(3);

CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- Workspaces that exist before billing launched stay free, so turning billing on locks nobody out.
UPDATE "Organization" SET "subscriptionStatus" = 'comped';
