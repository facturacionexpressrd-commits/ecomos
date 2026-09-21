import type { PgBoss, Job } from "pg-boss";
import { prisma } from "@/lib/db";
import { syncStore } from "@/lib/shopify/sync";
import { QUEUES, type SyncStoreJobData } from "@/lib/jobs/boss";

export async function handleSyncStore([job]: Job<SyncStoreJobData>[]) {
  const { storeId } = job.data;
  const startedAt = new Date();
  try {
    await syncStore(storeId);
  } catch (err) {
    await prisma.store.update({ where: { id: storeId }, data: { status: "error" } });
    throw err;
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
  await boss.work(QUEUES.syncStore, handleSyncStore);
}
