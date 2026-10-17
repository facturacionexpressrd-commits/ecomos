"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface CampaignActionMenuProps {
  storeId: string;
  campaignId: string;
  metaCampaignId: string;
  campaignName?: string;
  status: string;
  onActionCompleted: () => void;
}

export default function CampaignActionMenu({
  storeId,
  campaignId,
  metaCampaignId,
  campaignName,
  status,
  onActionCompleted,
}: CampaignActionMenuProps) {
  const t = useT();
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");

  const handleAction = async (action: string) => {
    try {
      if (action === "delete") {
        const label = campaignName
          ? t("campaignAction.named", { name: campaignName })
          : t("campaignAction.thisCampaign");
        if (!window.confirm(t("campaignAction.confirmDelete", { label }))) {
          return;
        }
      }

      setLoading(true);
      setErrorKey(null);
      setErrorText("");

      const endpoint =
        action === "pause"
          ? "/api/meta/campaigns/pause"
          : action === "activate"
            ? "/api/meta/campaigns/activate"
            : action === "duplicate"
              ? "/api/meta/campaigns/duplicate"
              : action === "delete"
                ? "/api/meta/campaigns/delete"
                : null;

      if (!endpoint) {
        setErrorKey("campaignAction.unknown");
        return;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          campaignId,
          metaCampaignId,
          ...(action === "duplicate" && { newName: t("campaignAction.copyName") }),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (data.error) {
          setErrorText(data.error);
        } else {
          setErrorText(t("campaignAction.failedStatus", { status: response.statusText }));
        }
        return;
      }

      setShowMenu(false);
      onActionCompleted();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "campaignAction.failed");
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowMenu(!showMenu)}
        aria-label={t("campaignAction.menu")}
        className="rounded-lg border border-line-hi bg-white/5 px-3 py-1 text-sm font-medium text-hi hover:bg-white/10"
        disabled={loading}
      >
        ⋯
      </button>

      {showMenu && (
        <div className="glass absolute top-full right-0 z-10 mt-1 w-40 overflow-hidden p-1">
          {status === "ACTIVE" && (
            <button
              onClick={() => handleAction("pause")}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-hi hover:bg-white/8 disabled:opacity-50"
              disabled={loading}
            >
              {t("campaignAction.pause")}
            </button>
          )}
          {status === "PAUSED" && (
            <button
              onClick={() => handleAction("activate")}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-hi hover:bg-white/8 disabled:opacity-50"
              disabled={loading}
            >
              {t("campaignAction.activate")}
            </button>
          )}
          <button
            onClick={() => handleAction("duplicate")}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-hi hover:bg-white/8 disabled:opacity-50"
            disabled={loading}
          >
            {t("campaignAction.duplicate")}
          </button>
          <button
            onClick={() => handleAction("delete")}
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-coral hover:bg-white/8 disabled:opacity-50"
            disabled={loading}
          >
            {t("campaignAction.delete")}
          </button>
        </div>
      )}

      {(errorKey || errorText) && (
        <div className="absolute mt-1 text-xs text-coral">
          {errorText || t(errorKey ?? "campaignAction.failed")}
        </div>
      )}
    </div>
  );
}
