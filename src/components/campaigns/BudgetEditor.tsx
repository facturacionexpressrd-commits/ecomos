"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BudgetEditorProps {
  storeId: string;
  campaignId: string;
  metaCampaignId: string;
  currentBudget?: number;
}

export default function BudgetEditor({
  storeId,
  campaignId,
  metaCampaignId,
  currentBudget,
}: BudgetEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [budget, setBudget] = useState(currentBudget?.toString() || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    try {
      setLoading(true);
      setError("");

      const budgetCents = Math.round(parseFloat(budget) * 100);
      if (budgetCents < 1) {
        setError("Budget must be at least $0.01");
        return;
      }

      const response = await fetch("/api/meta/campaigns/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          campaignId,
          metaCampaignId,
          dailyBudget: budgetCents,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update budget");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error updating budget");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
      >
        ✎ Edit Budget
      </button>

      {isOpen && (
        <div className="absolute right-0 top-10 z-50 rounded-lg border border-gray-200 bg-white p-4 shadow-lg">
          <div className="space-y-3 min-w-80">
            <div>
              <label className="block text-sm font-medium">Daily Budget (USD)</label>
              <div className="mt-1 flex items-center">
                <span className="text-lg font-medium">$</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  className="ml-2 flex-1 rounded border border-gray-300 px-2 py-1"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Minimum: $0.01/day</p>
            </div>

            {error && <div className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</div>}

            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="flex-1 rounded bg-gray-200 px-3 py-1 text-sm hover:bg-gray-300 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !budget}
                className="flex-1 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
