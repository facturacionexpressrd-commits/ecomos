/**
 * Idempotent dev/demo data: an Owner role, a placeholder store, the owner's access to it,
 * and a few products. Run `npm run db:seed` first so the owner has a User row.
 * Usage: SEED_OWNER_EMAIL="owner@example.com" npm run db:seed:test
 *
 * The store has no Shopify token, so it exercises the UI only; it will never sync.
 */
import { prisma } from "../src/lib/db";
import { OWNER_CAPABILITIES } from "../src/lib/auth/capabilities";

const SHOP = "ecomos-dev-seed.myshopify.com";

const PRODUCTS = [
  { n: 1, title: "Posture Corrector Brace", description: "Adjustable posture support brace for daily wear.", type: "Wellness", variants: [["PCB-M", "Medium", 29.99, 7.5], ["PCB-L", "Large", 29.99, 7.5]] },
  { n: 2, title: "LED Sunset Projector Lamp", description: "Ambient sunset-effect projector lamp for room decor.", type: "Home", variants: [["LSP-01", "Standard", 24.99, 5.2]] },
  { n: 3, title: "Portable Neck Fan", description: "Hands-free bladeless neck fan, USB-C rechargeable.", type: "Gadgets", variants: [["PNF-BLK", "Black", 19.99, 4.8]] },
] as const;

async function main() {
  const email = process.env.SEED_OWNER_EMAIL;
  if (!email) {
    console.log("Skipping test data (SEED_OWNER_EMAIL not set)");
    return;
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No User row for ${email}; run \`npm run db:seed\` first`);

  const role = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: user.organizationId, name: "Owner" } },
    create: { organizationId: user.organizationId, name: "Owner", capabilities: OWNER_CAPABILITIES },
    update: { capabilities: OWNER_CAPABILITIES },
  });

  const store = await prisma.store.upsert({
    where: { shopDomain: SHOP },
    create: { organizationId: user.organizationId, name: "EcomOS Dev Store", shopDomain: SHOP, status: "connected", connectedAt: new Date() },
    update: {},
  });

  await prisma.userStoreAccess.upsert({
    where: { userId_storeId: { userId: user.id, storeId: store.id } },
    create: { userId: user.id, storeId: store.id, roleId: role.id },
    update: { roleId: role.id },
  });

  let variantSeq = 0;
  for (const p of PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { storeId_shopifyGid: { storeId: store.id, shopifyGid: `gid://shopify/Product/900000000${p.n}` } },
      create: {
        storeId: store.id,
        shopifyGid: `gid://shopify/Product/900000000${p.n}`,
        title: p.title,
        status: "active",
        raw: { description: p.description, vendor: "EcomOS Seed", product_type: p.type },
      },
      update: {},
    });

    for (const [sku, title, price, cost] of p.variants) {
      const gid = `gid://shopify/ProductVariant/800000000${++variantSeq}`;
      await prisma.productVariant.upsert({
        where: { storeId_shopifyGid: { storeId: store.id, shopifyGid: gid } },
        create: { storeId: store.id, productId: product.id, shopifyGid: gid, sku, title, price, cost, raw: {} },
        update: {},
      });
    }
  }

  console.log(`Seeded "${store.name}" for ${email}: ${PRODUCTS.length} products`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
