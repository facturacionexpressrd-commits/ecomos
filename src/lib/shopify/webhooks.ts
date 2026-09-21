import { shopifyGraphQL } from "@/lib/shopify/client";

// Anything that changes what a sync would pull. Compliance topics (customers/redact, shop/redact,
// customers/data_request) can't be registered through the API; they live in the app's config.
export const WEBHOOK_TOPICS = [
  "ORDERS_CREATE",
  "ORDERS_UPDATED",
  "REFUNDS_CREATE",
  "PRODUCTS_UPDATE",
  "INVENTORY_LEVELS_UPDATE",
  "CUSTOMERS_UPDATE",
  "APP_UNINSTALLED",
] as const;

export const callbackUrlFor = (appUrl: string, topic: string) =>
  `${appUrl}/api/shopify/webhooks/${topic.toLowerCase().replace(/_/g, "-")}`;

export function missingTopics(existing: { topic: string; callbackUrl: string }[], appUrl: string) {
  return WEBHOOK_TOPICS.filter(
    (t) => !existing.some((e) => e.topic === t && e.callbackUrl === callbackUrlFor(appUrl, t))
  );
}

type ExistingResponse = {
  webhookSubscriptions: { nodes: { topic: string; endpoint: { callbackUrl?: string } }[] };
};
type CreateResponse = {
  webhookSubscriptionCreate: { userErrors: { message: string }[] };
};

/** Idempotent: only creates subscriptions that aren't already pointing at this app. */
export async function registerWebhooks(shop: string, accessToken: string, appUrl = process.env.SHOPIFY_APP_URL!) {
  const existing = await shopifyGraphQL<ExistingResponse>(
    shop,
    accessToken,
    `query { webhookSubscriptions(first: 100) { nodes { topic endpoint { ... on WebhookHttpEndpoint { callbackUrl } } } } }`
  );

  const missing = missingTopics(
    existing.webhookSubscriptions.nodes.map((n) => ({ topic: n.topic, callbackUrl: n.endpoint.callbackUrl ?? "" })),
    appUrl
  );

  const failed: { topic: string; message: string }[] = [];
  for (const topic of missing) {
    const res = await shopifyGraphQL<CreateResponse>(
      shop,
      accessToken,
      `mutation($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) { userErrors { message } }
      }`,
      { topic, sub: { callbackUrl: callbackUrlFor(appUrl, topic), format: "JSON" } }
    );
    const errors = res.webhookSubscriptionCreate.userErrors;
    if (errors.length > 0) failed.push({ topic, message: errors.map((e) => e.message).join("; ") });
  }

  return { created: missing.length - failed.length, alreadyPresent: WEBHOOK_TOPICS.length - missing.length, failed };
}
