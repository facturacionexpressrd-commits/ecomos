import { PgBoss } from "pg-boss";

export const QUEUES = {
  syncStore: "sync-store",
} as const;

let bossPromise: Promise<PgBoss> | null = null;

/** Shared pg-boss instance, lazily started once, reused by both the app (send) and the worker (work). */
export async function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(process.env.DATABASE_URL!);
      boss.on("error", (err) => console.error("[pg-boss]", err));
      await boss.start();
      // "stately" + a per-store singletonKey: at most one queued and one running sync per store,
      // so a burst of webhooks collapses into a single trailing sync. A queue's policy can't be
      // changed after creation, so an environment with an older queue must delete and recreate it.
      await boss.createQueue(QUEUES.syncStore, { policy: "stately" });
      return boss;
    })();
  }
  return bossPromise;
}

export type SyncStoreJobData = { storeId: string };

/** Returns null when a sync for this store is already waiting, which will cover this request too. */
export async function enqueueSyncStore(data: SyncStoreJobData) {
  const boss = await getBoss();
  return boss.send(QUEUES.syncStore, data, { singletonKey: data.storeId });
}
