import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { verifyWebhookHmac } from "@/lib/shopify/hmac";
import { emailLayout, sendEmail } from "@/lib/email";
import { reportError } from "@/lib/alerts";

// Shopify's three mandatory privacy webhooks. Unlike topic webhooks these are registered by URL
// in the app's own Dev Dashboard settings (Compliance webhooks), not via the Admin API — each of
// the three routes below needs its URL pasted in there by hand.
const CONTACT_EMAIL = process.env.COMPLIANCE_CONTACT_EMAIL || "rreyes325@gmail.com";

async function notifyOperator(subject: string, detailsHtml: string) {
  await sendEmail({
    to: CONTACT_EMAIL,
    subject: `[Shopify compliance] ${subject}`,
    html: emailLayout(`<h2 style="font-size:16px;margin:0 0 8px;">${subject}</h2>${detailsHtml}`),
  });
}

/**
 * Shared entry point for all three compliance webhooks: verifies the signature (same HMAC as
 * regular topic webhooks), parses the JSON body, and hands it to `handle`. Always answers 200
 * once the signature checks out — Shopify retries aggressively on anything else, and the actual
 * fulfillment work happens here, not in Shopify's retry loop.
 */
export async function handleComplianceWebhook(
  request: NextRequest,
  handle: (payload: Record<string, unknown>) => Promise<void>
): Promise<Response> {
  const rawBody = await request.text();
  const hmacHeader = request.headers.get("x-shopify-hmac-sha256");
  if (!verifyWebhookHmac(rawBody, hmacHeader, process.env.SHOPIFY_WEBHOOK_SECRET!)) {
    return new Response("Invalid HMAC", { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  try {
    await handle(payload);
  } catch (err) {
    await reportError(err, { where: "shopify compliance webhook" });
    // Still 200: Shopify would otherwise retry a request that failed for a reason retrying won't
    // fix (e.g. shop already gone), and the failure is already reported above.
  }
  return new Response("OK", { status: 200 });
}

/**
 * customers/data_request: a customer asked the merchant what EcomOS holds on them. There's no
 * self-serve export yet, so this emails the operator the request details to fulfill by hand —
 * Shopify requires a response within 30 days, not that the response be automated.
 */
export async function handleCustomersDataRequest(payload: Record<string, unknown>) {
  const customer = payload.customer as { id?: number; email?: string } | undefined;
  await notifyOperator(
    "Customer data request",
    `<p style="font-size:14px;">Shop: <code>${payload.shop_domain}</code></p>
     <p style="font-size:14px;">Customer: ${customer?.email ?? "unknown"} (id ${customer?.id ?? "unknown"})</p>
     <p style="font-size:14px;">Respond within 30 days per Shopify's requirement. Look up their orders/customer
     record for shop ${payload.shop_domain} and send them what EcomOS holds.</p>`
  );
}

/**
 * customers/redact: delete the named customer's personal data for this shop. Deletes the
 * Customer row (email/name/raw) — the main PII surface — and detaches it from their orders
 * rather than deleting the orders themselves, since financial records commonly have a legal
 * retention requirement independent of the customer's own deletion request.
 */
export async function handleCustomersRedact(payload: Record<string, unknown>) {
  const shopDomain = payload.shop_domain as string | undefined;
  const customer = payload.customer as { id?: number } | undefined;
  if (!shopDomain || !customer?.id) return;

  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store) return;

  const shopifyGid = `gid://shopify/Customer/${customer.id}`;
  const existing = await prisma.customer.findUnique({
    where: { storeId_shopifyGid: { storeId: store.id, shopifyGid } },
  });
  if (!existing) return;

  await prisma.$transaction([
    prisma.order.updateMany({ where: { customerId: existing.id }, data: { customerId: null } }),
    prisma.customer.delete({ where: { id: existing.id } }),
  ]);

  await notifyOperator(
    "Customer redacted",
    `<p style="font-size:14px;">Deleted customer ${shopifyGid} for shop <code>${shopDomain}</code>.</p>`
  );
}

/** shop/redact: arrives ~48h after uninstall. Delete everything for the shop — see compliance.ts
 * header comment; every storeId-scoped table cascades from Store, verified against the schema. */
export async function handleShopRedact(payload: Record<string, unknown>) {
  const shopDomain = payload.shop_domain as string | undefined;
  if (!shopDomain) return;

  const store = await prisma.store.findUnique({ where: { shopDomain } });
  if (!store) return;

  await prisma.store.delete({ where: { id: store.id } });
  await notifyOperator("Shop data purged", `<p style="font-size:14px;">Deleted all data for <code>${shopDomain}</code> per Shopify's shop/redact request.</p>`);
}
