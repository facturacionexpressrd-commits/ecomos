"use client";

import { useState } from "react";

interface AdSet {
  id: string;
  name: string;
  status: string;
  billingEvent: string;
  optimizationGoal: string;
  dailyBudget?: string;
  creatives: Array<{ id: string; name: string }>;
}

interface AdSetManagerProps {
  storeId: string;
  metaCampaignId: string;
  adSets: AdSet[];
  onAdSetCreated: () => void;
}

export default function AdSetManager({
  storeId,
  metaCampaignId,
  adSets,
  onAdSetCreated,
}: AdSetManagerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    billing_event: "CLICKS",
    optimization_goal: "LINK_CLICKS",
    daily_budget: "1",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError("");

      if (!formData.name.trim()) {
        setError("Ad set name required");
        return;
      }

      const response = await fetch("/api/meta/campaigns/adsets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          metaCampaignId,
          adSetData: {
            name: formData.name,
            billing_event: formData.billing_event,
            optimization_goal: formData.optimization_goal,
            daily_budget: Math.round(parseFloat(formData.daily_budget) * 100),
            targeting: {},
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create ad set");
      }

      setShowCreateForm(false);
      setFormData({ name: "", billing_event: "CLICKS", optimization_goal: "LINK_CLICKS", daily_budget: "1" });
      onAdSetCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error creating ad set");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ad Sets ({adSets.length})</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700"
        >
          + New Ad Set
        </button>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Ad Set Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="E.g., Audience A - Test"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">Billing Event</label>
              <select
                value={formData.billing_event}
                onChange={(e) => setFormData({ ...formData, billing_event: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="CLICKS">Clicks</option>
                <option value="IMPRESSIONS">Impressions</option>
                <option value="CONVERSIONS">Conversions</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Optimization Goal</label>
              <select
                value={formData.optimization_goal}
                onChange={(e) => setFormData({ ...formData, optimization_goal: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="LINK_CLICKS">Link Clicks</option>
                <option value="CONVERSIONS">Conversions</option>
                <option value="REACH">Reach</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Daily Budget (USD)</label>
            <div className="mt-1 flex items-center">
              <span className="text-lg font-medium">$</span>
              <input
                type="number"
                value={formData.daily_budget}
                onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
                min="0.01"
                step="0.01"
                className="ml-2 flex-1 rounded border border-gray-300 px-3 py-2"
              />
            </div>
          </div>

          {error && <div className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              disabled={loading}
              className="flex-1 rounded bg-gray-300 px-3 py-2 font-medium hover:bg-gray-400 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !formData.name}
              className="flex-1 rounded bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Ad Set"}
            </button>
          </div>
        </div>
      )}

      {adSets.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="text-gray-600">No ad sets yet. Create one to add creatives and start spending.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {adSets.map((adSet) => (
            <div key={adSet.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-4">
              <div>
                <p className="font-medium">{adSet.name}</p>
                <p className="text-xs text-gray-600">
                  {adSet.billingEvent} • {adSet.optimizationGoal} • {adSet.creatives.length} creatives
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                    adSet.status === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {adSet.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
