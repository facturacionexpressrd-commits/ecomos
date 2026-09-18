import { getBoss } from "@/lib/jobs/boss";
import { registerWorkers } from "@/lib/jobs/handlers";

async function main() {
  const boss = await getBoss();
  await registerWorkers(boss);
  console.log("[worker] listening on sync-store and process-webhook queues");
}

main().catch((err) => {
  console.error("[worker] fatal error", err);
  process.exit(1);
});
