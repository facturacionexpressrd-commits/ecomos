import type { PgBoss, Job } from "pg-boss";
import { prisma } from "@/lib/db";
import { syncStore } from "@/lib/shopify/sync";
import { QUEUES, enqueueSyncStore, type SyncStoreJobData } from "@/lib/jobs/boss";

export async function handleSyncStore([job]: Job<SyncStoreJobData>[], deadline = Infinity) {
  const { storeId } = job.data;
  const startedAt = new Date();
  let complete: boolean;
  try {
    complete = await syncStore(storeId, deadline);
  } catch (err) {
    await prisma.store.update({ where: { id: storeId }, data: { status: "error" } });
    throw err;
  }

  // Out of time: progress is saved in the watermarks, so queue a follow-up that continues from there.
  // Webhooks stay "received" until a sync actually finishes.
  if (!complete) {
    await enqueueSyncStore({ storeId });
    return;
  }

  // A successful sync recovers a store an earlier failure flagged (never one that lost its token).
  await prisma.store.updateMany({
    where: { id: storeId, status: "error", accessTokenEncrypted: { not: null } },
    data: { status: "connected" },
  });
  // Every webhook received before this sync began is now reflected in the data.
  await prisma.webhookEvent.updateMany({
    where: { storeId, status: "received", receivedAt: { lte: startedAt } },
    data: { status: "processed", processedAt: new Date() },
  });
}

export async function registerWorkers(boss: PgBoss) {
  // The long-running worker has no function timeout, so no deadline.
  await boss.work<SyncStoreJobData>(QUEUES.syncStore, (jobs) => handleSyncStore(jobs));
}
