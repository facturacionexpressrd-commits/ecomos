import { prisma } from "@/lib/db";

type Limits = { perMinute: number; perDay: number };

// Sized in rows saved: one product-copy call saves 1 row, one creative-concepts call saves several.
const LIMITS = {
  copy: { perMinute: 5, perDay: 100 },
  ideas: { perMinute: 20, perDay: 300 },
} as const satisfies Record<string, Limits>;

export function exceeded(used: { lastMinute: number; lastDay: number }, limits: Limits) {
  if (used.lastMinute >= limits.perMinute) return { retryAfterSeconds: 60 };
  if (used.lastDay >= limits.perDay) return { retryAfterSeconds: 3600 };
  return null;
}

/**
 * Caps how much AI a store can generate, so one member (or a stolen session) can't run up the
 * Anthropic bill. Counts what was already saved, so it needs no extra infrastructure.
 * ponytail: soft limit, since concurrent requests can all pass before any row lands. Move to a
 * shared counter (Redis/Upstash) if a hard cap ever matters.
 */
export async function aiQuotaExceeded(kind: keyof typeof LIMITS, storeId: string) {
  const now = Date.now();
  const since = (ms: number) => ({ storeId, createdAt: { gte: new Date(now - ms) } });
  const count = (where: ReturnType<typeof since>) =>
    kind === "copy" ? prisma.productAICopy.count({ where }) : prisma.creativeIdea.count({ where });
  const [lastMinute, lastDay] = await Promise.all([count(since(60_000)), count(since(86_400_000))]);
  return exceeded({ lastMinute, lastDay }, LIMITS[kind]);
}
