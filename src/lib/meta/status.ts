/**
 * A Meta account that holds a usable token. "error" is included because it's a transient sync
 * failure that the nightly job retries; "disconnected" (token wiped) and "expired" need the user
 * to reconnect first.
 */
export const ACTIVE_META = { status: { in: ["connected", "error"] as ("connected" | "error")[] } };
