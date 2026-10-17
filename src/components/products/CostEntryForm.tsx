"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface CostEntryFormProps {
  variantId: string;
  storeId: string;
  currentCost?: string;
}

export default function CostEntryForm({ variantId, storeId, currentCost }: CostEntryFormProps) {
  const t = useT();
  const router = useRouter();
  const [cost, setCost] = useState(currentCost ?? "");
  const [loading, setLoading] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorKey(null);
    setErrorText("");
    setSuccess(false);

    try {
      const res = await fetch("/api/variants/cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId,
          storeId,
          cost: cost ? parseFloat(cost) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "costForm.updateFailed");
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-lo">{t("costForm.label")}</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded border border-line-hi px-2 py-1 text-sm"
        />
        <p className="mt-1 text-xs text-faint">{t("costForm.hint")}</p>
      </div>

      {(errorKey || errorText) && (
        <p className="text-xs text-coral">{errorText || t(errorKey ?? "costForm.updateFailed")}</p>
      )}
      {success && <p className="text-xs text-teal">{t("costForm.success")}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-hi disabled:opacity-50"
      >
        {loading ? t("common.saving") : t("costForm.save")}
      </button>
    </form>
  );
}
