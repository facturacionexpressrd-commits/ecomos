"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ConnectMetaButtonProps {
  storeId: string;
}

const CALLBACK_ERRORS: Record<string, string> = {
  missing_code: "Authorization code missing",
  missing_store: "Store ID missing",
  state_mismatch: "Authorization could not be verified. Please try again.",
  no_store_access: "No access to this store",
  no_ad_accounts: "No Meta ad accounts were found for this login",
  selection_expired: "The account selection expired. Please connect again.",
  invalid_selection: "That ad account isn't available to this login",
  callback_failed: "OAuth callback failed",
  not_configured: "Meta integration isn't configured yet. Ask an admin to set META_APP_ID / META_APP_SECRET.",
  start_failed: "Couldn't start the Meta authorization flow. Try again in a moment.",
};

export default function ConnectMetaButton({ storeId }: ConnectMetaButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  // Both derive from the URL, so they're computed during render rather than
  // mirrored into state by an effect.
  const success = searchParams.get("meta_auth_success") === "true";
  const callbackError = searchParams.get("meta_auth_error");
  const error =
    fetchError || (callbackError ? CALLBACK_ERRORS[callbackError] ?? callbackError : "");

  // The refresh is a real side effect and stays in an effect — cleared on
  // unmount so a navigation mid-countdown can't refresh a gone component.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => router.refresh(), 2000);
    return () => clearTimeout(timer);
  }, [success, router]);

  const handleConnect = () => {
    // Full-page nav, not fetch: /api/meta/auth/start returns a 302 to facebook.com,
    // and fetch would follow that cross-origin redirect silently while the user's tab
    // stays on this page. Assigning window.location makes the browser actually leave.
    setLoading(true);
    setFetchError("");
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = `/api/meta/auth/start?storeId=${encodeURIComponent(storeId)}`;
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={loading || success}
        className="w-full rounded bg-gold px-4 py-2 font-medium text-ink hover:bg-gold-hi disabled:opacity-50"
      >
        {loading ? "Connecting..." : success ? "Connected!" : "Connect Meta Account"}
      </button>

      {error && (
        <div className="rounded bg-coral/10 p-3 space-y-2">
          <p className="text-sm text-coral font-medium">Error: {error}</p>
          <button
            onClick={handleConnect}
            disabled={loading}
            className="text-xs text-coral hover:underline font-medium"
          >
            Try again
          </button>
        </div>
      )}
      {success && (
        <p className="text-sm text-teal">✓ Meta account connected! Redirecting...</p>
      )}

      <p className="text-xs text-faint">
        This will open Meta&apos;s authorization page. You&apos;ll need to log in with your Meta
        Business account and grant permission to access your ad campaigns.
      </p>
    </div>
  );
}
