"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CostEntryFormProps {
  variantId: string;
  storeId: string;
  currentCost?: string;
}

export default function CostEntryForm({ variantId, storeId, currentCost }: CostEntryFormProps) {
  const router = useRouter();
  const [cost, setCost] = useState(currentCost ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
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
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update cost");
      }

      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-lo">Manual Cost (COGS)</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder="0.00"
          className="mt-1 w-full rounded border border-line-hi px-2 py-1 text-sm"
        />
        <p className="mt-1 text-xs text-faint">Your cost per unit (wholesale price, manufacturing, etc.)</p>
      </div>

      {error && <p className="text-xs text-coral">{error}</p>}
      {success && <p className="text-xs text-teal">✓ Cost updated</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded bg-gold px-3 py-2 text-sm font-medium text-ink hover:bg-gold-hi disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Cost"}
      </button>
    </form>
  );
}
