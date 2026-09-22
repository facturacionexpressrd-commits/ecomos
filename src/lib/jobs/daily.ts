import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { enqueueSyncStore } from "@/lib/jobs/boss";
import { drainQueues } from "@/lib/jobs/drain";
import { registerWebhooks } from "@/lib/shopify/webhooks";
import { syncAllMetaAccounts } from "@/lib/meta/sync";
import { generateApprovalRecommendations } from "@/lib/approval/recommender";
import { reportError } from "@/lib/alerts";
import { refreshAllCjLinks, syncCjOrders } from "@/lib/suppliers/cj-service";

const attempt = async <T>(fn: () => Promise<T>) => {
  try {
    return { ok: true as const, value: await fn() };
  } catch (err) {
    await reportError(err, { where: "nightly job" });
    return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
  }
};

/**
 * The nightly safety net. Live updates come from webhooks; this re-syncs every connected store in
 * case any were missed, re-checks the webhook subscriptions, drains the queue, then pulls Meta
 * spend (which also rolls up profit). Each step is isolated so one failure never skips the rest.
 */
export async function runDaily() {
  const stores = await prisma.store.findMany({
    where: { accessTokenEncrypted: { not: null } },
    select: { id: true, shopDomain: true, accessTokenEncrypted: true },
  });

  const shopify = [];
  for (const store of stores) {
    const webhooks = await attempt(() => registerWebhooks(store.shopDomain, decryptSecret(store.accessTokenEncrypted!)));
    const sync = await attempt(() => enqueueSyncStore({ storeId: store.id }));
    shopify.push({ shop: store.shopDomain, webhooks, sync: sync.ok });
  }

  const drain = await attempt(drainQueues);
  // After the Shopify drain, so newly synced orders' CJ status is pulled in the same run.
  const cjOrders = await attempt(syncCjOrders);
  const cjLinks = await attempt(refreshAllCjLinks);
  const meta = await attempt(syncAllMetaAccounts);
  // Runs after the Meta sync above so recommendations are based on today's spend data.
  const recommendations = await attempt(generateApprovalRecommendations);

  const failed =
    shopify.some((s) => !s.webhooks.ok || !s.sync) ||
    !drain.ok ||
    drain.value.failed > 0 ||
    !meta.ok ||
    !cjOrders.ok ||
    cjOrders.value.failed > 0;
  // Individual CJ link failures are recorded on each link (shown on the product page), not as a job failure.
  return { failed, stores: stores.length, shopify, drain, cjOrders, cjLinks, meta, recommendations };
}
