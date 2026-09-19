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
  no_businesses: "No Meta business accounts found",
  no_ad_accounts: "That Meta business has no ad accounts",
  callback_failed: "OAuth callback failed",
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

  const handleConnect = async () => {
    setLoading(true);
    setFetchError("");

    try {
      // Start OAuth flow
      const response = await fetch(`/api/meta/auth/start?storeId=${storeId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start authentication");
      }
      // Redirect is handled by fetch (will redirect to Meta)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleConnect}
        disabled={loading || success}
        className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Connecting..." : success ? "Connected!" : "Connect Meta Account"}
      </button>

      {error && <p className="text-sm text-red-600">Error: {error}</p>}
      {success && (
        <p className="text-sm text-green-600">✓ Meta account connected! Redirecting...</p>
      )}

      <p className="text-xs text-gray-500">
        This will open Meta&apos;s authorization page. You&apos;ll need to log in with your Meta
        Business account and grant permission to access your ad campaigns.
      </p>
    </div>
  );
}
