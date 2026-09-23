import { createHmac, randomBytes, timingSafeEqual } from "crypto";

// Pin deliberately; bump on purpose, never track "latest"/"unstable".
export const SHOPIFY_API_VERSION = "2025-01";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export type ShopifyAppCredentials = { apiKey: string; apiSecret: string; webhookSecret: string };

/** Shops listed in SHOPIFY_ALT_SHOPS (comma-separated myshopify domains), normalised. */
export function altShops(raw = process.env.SHOPIFY_ALT_SHOPS): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Which Shopify app a shop installs through. Most shops use the main (public) app; shops listed in
 * SHOPIFY_ALT_SHOPS use a second, custom-distribution app, which Shopify locks to specific stores.
 * Keeping it separate leaves the main app free for public distribution.
 */
export function appForShop(shop: string): ShopifyAppCredentials {
  if (altShops().includes(shop.toLowerCase())) {
    const apiSecret = env("SHOPIFY_ALT_API_SECRET");
    // A custom app signs its webhooks with its own client secret.
    return { apiKey: env("SHOPIFY_ALT_API_KEY"), apiSecret, webhookSecret: apiSecret };
  }
  return { apiKey: env("SHOPIFY_API_KEY"), apiSecret: env("SHOPIFY_API_SECRET"), webhookSecret: env("SHOPIFY_WEBHOOK_SECRET") };
}

/** Every secret that may sign an incoming webhook: a delivery is genuine if any of our apps signed it. */
export function webhookSecrets(): string[] {
  return [process.env.SHOPIFY_WEBHOOK_SECRET, process.env.SHOPIFY_ALT_API_SECRET].filter((s): s is string => !!s);
}

/** Signed OAuth state: ties the callback to the install request (CSRF) and carries the org + inviting user. */
export function signState(organizationId: string, userId: string): string {
  const nonce = randomBytes(16).toString("hex");
  const payload = Buffer.from(JSON.stringify({ organizationId, userId, nonce })).toString("base64url");
  const signature = createHmac("sha256", env("SHOPIFY_API_SECRET")).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyState(state: string): { organizationId: string; userId: string } | null {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", env("SHOPIFY_API_SECRET")).update(payload).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { organizationId, userId } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return { organizationId, userId };
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(shop: string, state: string): string {
  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", appForShop(shop).apiKey);
  url.searchParams.set("scope", env("SHOPIFY_SCOPES"));
  url.searchParams.set("redirect_uri", `${env("SHOPIFY_APP_URL")}/api/shopify/callback`);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(
  shop: string,
  code: string
): Promise<{ accessToken: string; scope: string }> {
  const app = appForShop(shop);
  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: app.apiKey, client_secret: app.apiSecret, code }),
  });

  if (!res.ok) {
    throw new Error(`Shopify token exchange failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; scope: string };
  return { accessToken: data.access_token, scope: data.scope };
}

export async function shopifyGraphQL<T>(
  shop: string,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify GraphQL request failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { data?: T; errors?: unknown };
  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}
