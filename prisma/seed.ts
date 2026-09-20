/**
 * One-time bootstrap for the first organization + owner user. Invitation-based auth
 * has no self-serve "create an org" flow by design — someone has to be first.
 *
 * Usage:
 *   1. Sign up at /login with the owner's email (creates the Supabase auth user).
 *   2. SEED_ORG_NAME="Acme" SEED_OWNER_EMAIL="owner@example.com" npm run db:seed
 *   3. After seeding org, run: SEED_TEST_DATA=1 npm run db:seed (seeds test store + products)
 */
import { createAdminClient } from "../src/lib/supabase/admin";
import { prisma } from "../src/lib/db";

async function seedOrganization() {
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

  console.log(`✅ Seeded organization "${organization.name}" (${organization.id}) with owner ${ownerEmail}`);
  return { user: authUser, organization };
}

async function seedTestData() {
  const ownerEmail = process.env.SEED_OWNER_EMAIL || "test@example.com";

  const user = await prisma.user.findFirst({ where: { email: ownerEmail } });
  if (!user) {
    throw new Error(`User ${ownerEmail} not found. Run org seeding first.`);
  }

  // Create test store
  const store = await prisma.store.create({
    data: {
      name: "Test Store",
      organizationId: user.organizationId,
      shopifyDomain: "test-store.myshopify.com",
      status: "active",
    },
  });
  console.log(`✅ Created test store: ${store.name}`);

  // Grant store access to user
  await prisma.userStoreAccess.create({
    data: {
      userId: user.id,
      storeId: store.id,
      capability: "storeRead,storeWrite,syncData,ordersRead,ordersWrite",
    },
  });
  console.log(`✅ Granted store access to user`);

  // Create test products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        storeId: store.id,
        shopifyId: "gid://shopify/Product/1001",
        title: "Eco-Friendly Water Bottle",
        description: "Sustainable stainless steel water bottle, 32oz",
        handle: "eco-water-bottle",
        price: 4500, // $45.00
        currency: "USD",
        status: "active",
        variants: {
          create: [
            { shopifyId: "gid://shopify/ProductVariant/1001", title: "Blue", sku: "ECOBOT-BLU", price: 4500 },
            { shopifyId: "gid://shopify/ProductVariant/1002", title: "Green", sku: "ECOBOT-GRN", price: 4500 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        storeId: store.id,
        shopifyId: "gid://shopify/Product/1002",
        title: "Bamboo Cutting Board Set",
        description: "3-piece organic bamboo cutting board set",
        handle: "bamboo-cutting-board",
        price: 2999, // $29.99
        currency: "USD",
        status: "active",
        variants: {
          create: [
            { shopifyId: "gid://shopify/ProductVariant/2001", title: "Default", sku: "BAMBCUT-001", price: 2999 },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        storeId: store.id,
        shopifyId: "gid://shopify/Product/1003",
        title: "Organic Cotton T-Shirt",
        description: "100% organic cotton unisex t-shirt",
        handle: "organic-cotton-tshirt",
        price: 1999, // $19.99
        currency: "USD",
        status: "active",
        variants: {
          create: [
            { shopifyId: "gid://shopify/ProductVariant/3001", title: "Small", sku: "ORGCOT-S", price: 1999 },
            { shopifyId: "gid://shopify/ProductVariant/3002", title: "Medium", sku: "ORGCOT-M", price: 1999 },
            { shopifyId: "gid://shopify/ProductVariant/3003", title: "Large", sku: "ORGCOT-L", price: 1999 },
          ],
        },
      },
    }),
  ]);
  console.log(`✅ Created ${products.length} test products`);

  // Create test offers (cost + margin combos)
  const offers = await Promise.all(
    products.map((product, idx) =>
      prisma.offer.create({
        data: {
          storeId: store.id,
          productId: product.id,
          title: `${product.title} - Standard`,
          cost: Math.floor(product.price * 0.4), // 40% markup = 60% cost
          margin: Math.floor(product.price * 0.6),
          status: "active",
        },
      })
    )
  );
  console.log(`✅ Created ${offers.length} test offers`);

  // Create test creatives
  const creatives = await Promise.all([
    prisma.creative.create({
      data: {
        storeId: store.id,
        title: "Eco-Friendly Lifestyle Image",
        type: "image",
        url: "https://via.placeholder.com/1200x628?text=Eco+Lifestyle",
        status: "approved",
      },
    }),
    prisma.creative.create({
      data: {
        storeId: store.id,
        title: "Product Demo Video",
        type: "video",
        url: "https://via.placeholder.com/1200x628?text=Product+Demo",
        status: "approved",
      },
    }),
  ]);
  console.log(`✅ Created ${creatives.length} test creatives`);

  // Create test Meta campaign
  const campaign = await prisma.metaCampaign.create({
    data: {
      storeId: store.id,
      externalCampaignId: "meta_test_campaign_001",
      name: "Eco Products Q4 2026",
      objective: "CONVERSIONS",
      status: "ACTIVE",
      dailyBudget: 5000, // $50/day
      currency: "USD",
      products: {
        connect: products.map((p) => ({ id: p.id })),
      },
    },
  });
  console.log(`✅ Created test Meta campaign`);

  // Create test research watchlist items
  const watchlistItems = await Promise.all([
    prisma.researchWatchlist.create({
      data: {
        storeId: store.id,
        externalProductId: "ext_watch_001",
        productTitle: "Reusable Bamboo Straws",
        cost: 200,
        estimatedRetailPrice: 1200,
        shippingCost: 250,
        margin: 1000,
        opportunityScore: 82,
        competitionLevel: "MEDIUM",
        demandSignals: JSON.stringify({ reviews: 150, rating: 4.6, trending: true }),
        status: "watching",
      },
    }),
    prisma.researchWatchlist.create({
      data: {
        storeId: store.id,
        externalProductId: "ext_watch_002",
        productTitle: "Sustainable Lunch Container",
        cost: 300,
        estimatedRetailPrice: 1500,
        shippingCost: 180,
        margin: 1200,
        opportunityScore: 78,
        competitionLevel: "LOW",
        demandSignals: JSON.stringify({ reviews: 89, rating: 4.4, trending: false }),
        status: "watching",
      },
    }),
  ]);
  console.log(`✅ Created ${watchlistItems.length} research watchlist items`);

  // Create test notification preferences
  await prisma.notificationPreferences.create({
    data: {
      userId: user.id,
      storeId: store.id,
      approval_pending: true,
      approval_approved: true,
      approval_rejected: true,
      campaign_launched: true,
      campaign_paused: true,
      opportunity_found: true,
      creative_generated: true,
      product_published: true,
      order_routed: true,
      sync_completed: true,
      error_alert: true,
      emailNotifications: true,
      inAppNotifications: true,
      digestFrequency: "immediate",
    },
  });
  console.log(`✅ Created notification preferences`);

  console.log(`\n✨ Test data seeding complete!`);
  console.log(`Store ID: ${store.id}`);
  console.log(`User can now access the dashboard and start using EcomOS.`);
}

async function main() {
  if (process.env.SEED_TEST_DATA) {
    await seedTestData();
  } else {
    await seedOrganization();
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
