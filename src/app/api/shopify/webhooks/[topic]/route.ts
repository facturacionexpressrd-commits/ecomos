import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookHmac } from "@/lib/shopify/hmac";
import { isDuplicateWebhookError } from "@/lib/shopify/webhook-idempotency";
import { enqueueProcessWebhook } from "@/lib/jobs/boss";

export async function POST(request: NextRequest, { params }: { params: Promise<{ topic: string }> }) {
  const { topic } = await params;
  const rawBody = await request.text();

  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyWebhookHmac(rawBody, hmacHeader, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const webhookId = request.headers.get("x-shopify-webhook-id");
  if (!shopDomain || !webhookId) {
    return new Response("Missing Shopify headers", { status: 400 });
  }

  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store) {
    return new Response("Unknown store", { status: 404 });
  }

  let webhookEvent;
  try {
    webhookEvent = await prisma.webhookEvent.create({
      data: { storeId: store.id, shopifyWebhookId: webhookId, topic },
    });
  } catch (err) {
    if (isDuplicateWebhookError(err)) {
      // Already recorded this webhook id — Shopify retried a delivery. No-op.
      return new Response("OK (duplicate)", { status: 200 });
    }
    throw err;
  }

  await enqueueProcessWebhook({
    storeId: store.id,
    topic,
    webhookEventId: webhookEvent.id,
    payload: JSON.parse(rawBody),
  });

  return new Response("OK", { status: 200 });
}
