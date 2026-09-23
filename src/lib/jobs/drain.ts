import { getBoss, QUEUES } from "@/lib/jobs/boss";
import { handleSyncStore } from "@/lib/jobs/handlers";
import { reportError } from "@/lib/alerts";

// Vercel can't host the long-running `npm run worker`, so jobs are drained on demand instead.
// ponytail: capped per call so one invocation stays inside the function timeout.
// Raise PER_QUEUE_LIMIT, or move to a real always-on worker, if sync volume outgrows it.
const PER_QUEUE_LIMIT = 5;
// Vercel functions stop at 300s. Syncs stop starting new pages after this and save their place,
// leaving headroom to finish the page in flight and queue the follow-up.
const TIME_BUDGET_MS = 240_000;

export async function drainQueues() {
  const boss = await getBoss();
  const result = { processed: 0, failed: 0 };
  const deadline = Date.now() + TIME_BUDGET_MS;

  for (let i = 0; i < PER_QUEUE_LIMIT && Date.now() < deadline; i++) {
    const jobs = await boss.fetch(QUEUES.syncStore, { batchSize: 1 });
    if (jobs.length === 0) break;
    try {
      await handleSyncStore(jobs as never, deadline);
      await boss.complete(QUEUES.syncStore, jobs[0].id);
      result.processed++;
    } catch (err) {
      await reportError(err, { where: "sync-store job", storeId: (jobs[0].data as { storeId?: string }).storeId });
      await boss.fail(QUEUES.syncStore, jobs[0].id, { message: err instanceof Error ? err.message : String(err) });
      result.failed++;
    }
  }

  return result;
}
