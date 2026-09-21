import { after, NextRequest } from "next/server";
import { drainQueues } from "@/lib/jobs/drain";
import { prisma } from "@/lib/db";
import { verifyWebhookHmac } from "@/lib/shopify/hmac";
import { isDuplicateWebhookError } from "@/lib/shopify/webhook-idempotency";
import { enqueueSyncStore } from "@/lib/jobs/boss";
import { reportError } from "@/lib/alerts";

export async function POST(request: NextRequest, { params }: { params: Promise<{ topic: string }> }) {
  const { topic: pathTopic } = await params;
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
  const topic = request.headers.get("x-shopify-topic") ?? pathTopic;

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

  // The token is revoked at this point, so a sync could only fail; drop it and flag the store.
  if (topic === "app/uninstalled") {
    await prisma.store.update({ where: { id: store.id }, data: { accessTokenEncrypted: null, status: "error" } });
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: "processed", processedAt: new Date() },
    });
    return new Response("OK", { status: 200 });
  }

  // Every other topic means "something changed": request a sync of the store. Bursts collapse into
  // one trailing sync, and the sync marks this event processed once it has run.
  await enqueueSyncStore({ storeId: store.id });
  after(() => drainQueues().catch((err) => reportError(err, { where: "[drain]" })));

  return new Response("OK", { status: 200 });
}
