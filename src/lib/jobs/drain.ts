import { getBoss, QUEUES } from "@/lib/jobs/boss";
import { handleProcessWebhook, handleSyncStore } from "@/lib/jobs/handlers";

const HANDLERS = {
  [QUEUES.syncStore]: handleSyncStore,
  [QUEUES.processWebhook]: handleProcessWebhook,
} as const;

// Vercel can't host the long-running `npm run worker`, so jobs are drained on demand instead.
// ponytail: capped per queue per call so one invocation stays inside the function timeout.
// Raise PER_QUEUE_LIMIT, or move to a real always-on worker, if sync volume outgrows it.
const PER_QUEUE_LIMIT = 5;

export async function drainQueues() {
  const boss = await getBoss();
  const result = { processed: 0, failed: 0 };

  for (const [queue, handler] of Object.entries(HANDLERS)) {
    for (let i = 0; i < PER_QUEUE_LIMIT; i++) {
      const jobs = await boss.fetch(queue, { batchSize: 1 });
      if (jobs.length === 0) break;
      try {
        await handler(jobs as never);
        await boss.complete(queue, jobs[0].id);
        result.processed++;
      } catch (err) {
        await boss.fail(queue, jobs[0].id, { message: err instanceof Error ? err.message : String(err) });
        result.failed++;
      }
    }
  }

  return result;
}
