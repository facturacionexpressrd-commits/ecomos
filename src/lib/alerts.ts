const WINDOW_MS = 10 * 60 * 1000;
const lastSent = new Map<string, number>();

/** Strips anything credential-shaped before an error message is logged or sent anywhere. */
export function redact(text: string) {
  return text
    .replace(/\b(access_token|token|secret|password|api_?key|key)=[^&\s"']+/gi, "$1=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/g, "Bearer [redacted]")
    .replace(/\b(shp[a-z]{2}_|EAA|sk-ant-|sk-|eyJ)[A-Za-z0-9._-]{12,}/g, "[redacted]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/g, "[redacted-db-url]");
}

/** True at most once per WINDOW_MS per key, so one broken endpoint can't flood the channel. */
export function shouldSend(key: string, now = Date.now(), seen = lastSent) {
  const last = seen.get(key);
  if (last !== undefined && now - last < WINDOW_MS) return false;
  seen.set(key, now);
  return true;
}

/**
 * Logs a structured line (searchable in Vercel logs) and, if ALERT_WEBHOOK_URL is set, posts it to
 * a Slack/Discord-style webhook. Never throws: reporting an error must not become another error.
 * ponytail: the de-dupe is per server instance, so a busy fleet may repeat an alert. Move it to the
 * database or swap in Sentry if that gets noisy.
 */
export async function reportError(error: unknown, context: Record<string, string | undefined> = {}) {
  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const message = redact(err.message);
    console.error(JSON.stringify({ level: "error", message, ...context, stack: redact((err.stack ?? "").split("\n").slice(0, 6).join("\n")) }));

    const url = process.env.ALERT_WEBHOOK_URL;
    if (!url || !shouldSend(`${context.where ?? ""}:${message}`)) return;

    const text = `EcomOS error${context.where ? ` in ${context.where}` : ""}: ${message}`.slice(0, 1500);
    // Slack reads `text`, Discord reads `content`; each ignores the other.
    await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, content: text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // swallowed on purpose
  }
}
