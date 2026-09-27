import { getBoss, QUEUES } from "@/lib/jobs/boss";
import { handleSyncStore } from "@/lib/jobs/handlers";
import { reportError } from "@/lib/alerts";

// Vercel can't host the long-running `npm run worker`, so jobs are drained on demand instead.
// Capped per call so one invocation stays inside the function timeout; when work is left over,
// drainAndContinue hands it to a fresh invocation instead of leaving it for the nightly cron.
// ponytail: one chain at a time per trigger; move to Vercel Queues or an always-on worker if
// many large stores sync at once.
const PER_QUEUE_LIMIT = 5;
// Vercel functions stop at 300s. Syncs stop starting new pages after this and save their place,
// leaving headroom to finish the page in flight and queue the follow-up.
const TIME_BUDGET_MS = 240_000;

export async function drainQueues() {
  const boss = await getBoss();
  const result = { processed: 0, failed: 0, more: true };
  const deadline = Date.now() + TIME_BUDGET_MS;

  for (let i = 0; i < PER_QUEUE_LIMIT && Date.now() < deadline; i++) {
    const jobs = await boss.fetch(QUEUES.syncStore, { batchSize: 1 });
    if (jobs.length === 0) {
      result.more = false;
      break;
    }
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

/** Whether a drain should hand off to another invocation: work is left and this run made progress. */
export function shouldContinue(r: { processed: number; more: boolean }) {
  return r.more && r.processed > 0;
}

/**
 * Drains, then if jobs remain (a big store's sync saved its place, or the per-call cap was hit),
 * asks /api/cron/drain to carry on in a fresh function with its own time budget. That route answers
 * immediately and drains in after(), so this call returns fast and the chain runs until the queue
 * is empty. Stops when a run makes no progress, so a job that keeps failing can't loop forever.
 */
export async function drainAndContinue() {
  const result = await drainQueues();
  const base = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.CRON_SECRET;
  if (shouldContinue(result) && base && secret) {
    await fetch(`${base}/api/cron/drain`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(10_000),
    }).catch((err) => reportError(err, { where: "[drain handoff]" }));
  }
  return result;
}
