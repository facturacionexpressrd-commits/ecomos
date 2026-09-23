import { after, NextRequest } from "next/server";
import { drainQueues } from "@/lib/jobs/drain";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";
import { verifyOAuthHmac } from "@/lib/shopify/hmac";
import { appForShop, exchangeCodeForToken, verifyState } from "@/lib/shopify/client";
import { enqueueSyncStore } from "@/lib/jobs/boss";
import { registerWebhooks } from "@/lib/shopify/webhooks";
import { OWNER_CAPABILITIES } from "@/lib/auth/capabilities";
import { reportError } from "@/lib/alerts";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const shop = params.get("shop");
  const code = params.get("code");
  const state = params.get("state");

  if (!shop || !code || !state) {
    return new Response("Missing shop/code/state", { status: 400 });
  }

  // Signed with the secret of whichever app this shop installs through (see appForShop).
  if (!verifyOAuthHmac(params, appForShop(shop).apiSecret)) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  const decoded = verifyState(state);
  if (!decoded) {
    return new Response("Invalid or expired state", { status: 401 });
  }

  const { accessToken, scope } = await exchangeCodeForToken(shop, code);
  const accessTokenEncrypted = encryptSecret(accessToken);

  const store = await prisma.store.upsert({
    where: { shopDomain: shop },
    create: {
      organizationId: decoded.organizationId,
      name: shop,
      shopDomain: shop,
      accessTokenEncrypted,
      scope,
      status: "connected",
      connectedAt: new Date(),
    },
    update: {
      accessTokenEncrypted,
      scope,
      status: "connected",
      connectedAt: new Date(),
    },
  });

  // The person who ran /api/shopify/install gets full access to the store they just
  // connected — an "Owner" role (all known capabilities), created once per org and
  // reused. Anyone else needs an invitation scoped to this store.
  const ownerRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: decoded.organizationId, name: "Owner" } },
    create: { organizationId: decoded.organizationId, name: "Owner", capabilities: OWNER_CAPABILITIES },
    update: { capabilities: OWNER_CAPABILITIES },
  });

  await prisma.userStoreAccess.upsert({
    where: { userId_storeId: { userId: decoded.userId, storeId: store.id } },
    create: { userId: decoded.userId, storeId: store.id, roleId: ownerRole.id },
    update: { roleId: ownerRole.id },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: decoded.organizationId,
      userId: decoded.userId,
      storeId: store.id,
      action: "store.connected",
      metadata: { shop },
    },
  });

  await enqueueSyncStore({ storeId: store.id });
  after(async () => {
    // The nightly cron re-checks these, so a failure here delays live updates rather than losing them.
    await registerWebhooks(shop, accessToken).catch((err) => reportError(err, { where: "[webhooks]" }));
    await drainQueues().catch((err) => reportError(err, { where: "[drain]" }));
  });

  return Response.redirect(new URL(`/dashboard?store=${store.id}`, process.env.SHOPIFY_APP_URL));
}
