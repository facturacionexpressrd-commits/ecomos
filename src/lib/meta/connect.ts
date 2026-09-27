import { prisma } from "@/lib/db";
import { decryptToken, encryptToken, type MetaClient } from "@/lib/meta/client";

export type AdAccountChoice = {
  businessId: string;
  businessName: string;
  adAccountId: string;
  adAccountName: string;
};

/** Every ad account the token can reach, across all of the user's businesses. */
export async function listAdAccountChoices(client: MetaClient, token: string): Promise<AdAccountChoice[]> {
  const businesses = await client.getBusinessAccounts(token);
  const perBusiness = await Promise.all(
    businesses.map(async (b) =>
      (await client.getAdAccounts(b.id, token)).map((a) => ({
        businessId: b.id,
        businessName: b.name,
        adAccountId: a.id,
        adAccountName: a.name,
      }))
    )
  );
  return perBusiness.flat();
}

const PENDING_TTL_MS = 10 * 60 * 1000;

/** Seals the OAuth token for the "pick an ad account" step; AES-GCM, so tampering fails to open. */
export function sealPending(payload: { token: string; storeId: string }, key: string, now = Date.now()): string {
  return encryptToken(JSON.stringify({ ...payload, exp: now + PENDING_TTL_MS }), key);
}

export function openPending(sealed: string | undefined, key: string, now = Date.now()) {
  if (!sealed) return null;
  try {
    const p = JSON.parse(decryptToken(sealed, key)) as { token: string; storeId: string; exp: number };
    return p.exp > now ? { token: p.token, storeId: p.storeId } : null;
  } catch {
    return null;
  }
}

export async function connectAdAccount(input: {
  storeId: string;
  userId: string;
  accessToken: string;
  businessId: string;
  adAccountId: string;
}) {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY not set");

  const store = await prisma.store.findUniqueOrThrow({
    where: { id: input.storeId },
    select: { organizationId: true },
  });
  const fields = {
    storeId: input.storeId,
    metaAccountId: input.adAccountId,
    accessTokenEncrypted: encryptToken(input.accessToken, key),
    scope: "ads_read,ads_management",
    status: "connected" as const,
  };

  // Reconnecting the same business refreshes the token instead of colliding on its unique id.
  const metaAccount = await prisma.metaAccount.upsert({
    where: { metaBusinessId: input.businessId },
    update: fields,
    create: { ...fields, metaBusinessId: input.businessId },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: store.organizationId,
      userId: input.userId,
      storeId: input.storeId,
      action: "meta_account_connected",
      metadata: { metaBusinessId: input.businessId, metaAdAccountId: input.adAccountId, metaAccountId: metaAccount.id },
    },
  });
  return metaAccount;
}
