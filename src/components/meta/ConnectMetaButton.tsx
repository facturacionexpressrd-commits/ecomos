"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

interface ConnectMetaButtonProps {
  storeId: string;
}

export default function ConnectMetaButton({ storeId }: ConnectMetaButtonProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Handle OAuth callback results
  useEffect(() => {
    const successParam = searchParams.get("meta_auth_success");
    const errorParam = searchParams.get("meta_auth_error");

    if (successParam === "true") {
      setSuccess(true);
      setTimeout(() => router.refresh(), 2000);
    }

    if (errorParam) {
      const errorMap: Record<string, string> = {
        missing_code: "Authorization code missing",
        missing_store: "Store ID missing",
        no_store_access: "No access to this store",
        no_businesses: "No Meta business accounts found",
        callback_failed: "OAuth callback failed",
      };
      setError(errorMap[errorParam] || errorParam);
    }
  }, [searchParams, router]);

  const handleConnect = async () => {
    setLoading(true);
    setError("");

    try {
      // Start OAuth flow
      const response = await fetch(`/api/meta/auth/start?storeId=${storeId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start authentication");
      }
      // Redirect is handled by fetch (will redirect to Meta)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
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
        This will open Meta's authorization page. You'll need to log in with your Meta Business account
        and grant permission to access your ad campaigns.
      </p>
    </div>
  );
}
