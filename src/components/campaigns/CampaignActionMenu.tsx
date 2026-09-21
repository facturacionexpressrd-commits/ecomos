"use client";

import { useState } from "react";

interface CampaignActionMenuProps {
  storeId: string;
  campaignId: string;
  metaCampaignId: string;
  status: string;
  onActionCompleted: () => void;
}

export default function CampaignActionMenu({
  storeId,
  campaignId,
  metaCampaignId,
  status,
  onActionCompleted,
}: CampaignActionMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAction = async (action: string) => {
    try {
      setLoading(true);
      setError("");

      const endpoint =
        action === "pause"
          ? "/api/meta/campaigns/pause"
          : action === "activate"
            ? "/api/meta/campaigns/activate"
            : action === "duplicate"
              ? "/api/meta/campaigns/duplicate"
              : null;

      if (!endpoint) throw new Error("Unknown action");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          campaignId,
          metaCampaignId,
          ...(action === "duplicate" && { newName: `Copy of campaign` }),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Action failed: ${response.statusText}`);
      }

      setShowMenu(false);
      onActionCompleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="rounded bg-gray-200 px-3 py-1 text-sm font-medium hover:bg-gray-300"
        disabled={loading}
      >
        ⋯
      </button>

      {showMenu && (
        <div className="absolute right-0 top-full z-10 mt-1 rounded border border-gray-200 bg-white shadow-lg">
          {status === "ACTIVE" && (
            <button
              onClick={() => handleAction("pause")}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              ⏸ Pause
            </button>
          )}
          {status === "PAUSED" && (
            <button
              onClick={() => handleAction("activate")}
              className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
              disabled={loading}
            >
              ▶ Activate
            </button>
          )}
          <button
            onClick={() => handleAction("duplicate")}
            className="block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={loading}
          >
            📋 Duplicate
          </button>
        </div>
      )}

      {error && <div className="absolute mt-1 text-xs text-red-600">{error}</div>}
    </div>
  );
}
