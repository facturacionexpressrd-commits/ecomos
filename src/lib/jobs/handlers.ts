import type { PgBoss, Job } from "pg-boss";
import { prisma } from "@/lib/db";
import { syncStore } from "@/lib/shopify/sync";
import { QUEUES, type ProcessWebhookJobData, type SyncStoreJobData } from "@/lib/jobs/boss";

export async function handleSyncStore([job]: Job<SyncStoreJobData>[]) {
  const { storeId } = job.data;
  try {
    await syncStore(storeId);
  } catch (err) {
    await prisma.store.update({ where: { id: storeId }, data: { status: "error" } });
    throw err;
  }
}

// ponytail: every webhook triggers a full store resync (sync.ts upserts are idempotent,
// so this is correct, just not minimal). Add topic-specific incremental updates
// (e.g. patch just the one order/product) if webhook volume makes full resync too slow.
export async function handleProcessWebhook([job]: Job<ProcessWebhookJobData>[]) {
  const { storeId, webhookEventId } = job.data;
  try {
    await syncStore(storeId);
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { processedAt: new Date(), status: "processed" },
    });
  } catch (err) {
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: "failed" },
    });
    throw err;
  }
}

export async function registerWorkers(boss: PgBoss) {
  await boss.work(QUEUES.syncStore, handleSyncStore);
  await boss.work(QUEUES.processWebhook, handleProcessWebhook);
}
