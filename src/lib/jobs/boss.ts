import { PgBoss } from "pg-boss";

export const QUEUES = {
  syncStore: "sync-store",
  processWebhook: "process-webhook",
} as const;

let bossPromise: Promise<PgBoss> | null = null;

/** Shared pg-boss instance, lazily started once, reused by both the app (send) and the worker (work). */
export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(process.env.DATABASE_URL!);
      boss.on("error", (err) => console.error("[pg-boss]", err));
      await boss.start();
      for (const queue of Object.values(QUEUES)) {
        await boss.createQueue(queue);
      }
      return boss;
    })();
  }
  return bossPromise;
}

export type SyncStoreJobData = { storeId: string };
export type ProcessWebhookJobData = {
  storeId: string;
  topic: string;
  webhookEventId: string;
  payload: unknown;
};

export async function enqueueSyncStore(data: SyncStoreJobData) {
  const boss = await getBoss();
  return boss.send(QUEUES.syncStore, data);
}

export async function enqueueProcessWebhook(data: ProcessWebhookJobData) {
  const boss = await getBoss();
  return boss.send(QUEUES.processWebhook, data);
}
