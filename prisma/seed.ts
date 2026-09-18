/**
 * One-time bootstrap for the first organization + owner user. Invitation-based auth
 * has no self-serve "create an org" flow by design — someone has to be first.
 *
 * Usage:
 *   1. Sign up at /login with the owner's email (creates the Supabase auth user).
 *   2. SEED_ORG_NAME="Acme" SEED_OWNER_EMAIL="owner@example.com" npm run db:seed
 */
import { createAdminClient } from "../src/lib/supabase/admin";
import { prisma } from "../src/lib/db";

async function main() {
  const orgName = process.env.SEED_ORG_NAME;
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  if (!orgName || !ownerEmail) {
    throw new Error("Set SEED_ORG_NAME and SEED_OWNER_EMAIL env vars before running this script");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;

  const authUser = data.users.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase());
  if (!authUser) {
    throw new Error(`No Supabase auth user with email ${ownerEmail} — sign up at /login first`);
  }

  const existingUser = await prisma.user.findUnique({ where: { id: authUser.id } });
  const organization = existingUser
    ? await prisma.organization.findUniqueOrThrow({ where: { id: existingUser.organizationId } })
    : await prisma.organization.create({ data: { name: orgName } });

  await prisma.user.upsert({
    where: { id: authUser.id },
    create: { id: authUser.id, organizationId: organization.id, email: ownerEmail },
    update: {},
  });

  console.log(`Seeded organization "${organization.name}" (${organization.id}) with owner ${ownerEmail}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
