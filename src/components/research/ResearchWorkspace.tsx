"use client";

import { useState } from "react";

interface ScoredOpportunity {
  productId: string;
  productTitle: string;
  cost: number;
  estimatedRetailPrice: number;
  margin: number;
  shippingCost: number;
  opportunityScore: number;
  scoreBreakdown: {
    marginScore: number;
    competitionScore: number;
    demandScore: number;
    costScore: number;
  };
  confidence: number;
  reasoning: string[];
}

interface ResearchWorkspaceProps {
  storeId: string;
}

export default function ResearchWorkspace({ storeId }: ResearchWorkspaceProps) {
  const [results, setResults] = useState<ScoredOpportunity[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<ScoredOpportunity | null>(null);

  // Search filters
  const [minMargin, setMinMargin] = useState(0.4);
  const [maxCost, setMaxCost] = useState(50);
  const [maxShipping, setMaxShipping] = useState(10);
  const [competitionLevel, setCompetitionLevel] = useState<"" | "low" | "medium" | "high">("");

  const handleSearch = async () => {
    try {
      setSearching(true);
      setError("");

      const response = await fetch("/api/research/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          minMargin: minMargin || undefined,
          maxCost: maxCost || undefined,
          maxShipping: maxShipping || undefined,
          competitionLevel: competitionLevel || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error searching");
    } finally {
      setSearching(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-green-700";
    if (score >= 60) return "text-blue-700";
    if (score >= 40) return "text-yellow-700";
    return "text-red-700";
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50 border-green-200";
    if (score >= 60) return "bg-blue-50 border-blue-200";
    if (score >= 40) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Search Opportunities</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium">Min Margin (%)</label>
            <input
              type="number"
              value={minMargin * 100}
              onChange={(e) => setMinMargin(parseFloat(e.target.value) / 100)}
              step={5}
              min={0}
              max={100}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Max Cost (USD)</label>
            <input
              type="number"
              value={maxCost}
              onChange={(e) => setMaxCost(parseFloat(e.target.value))}
              step={5}
              min={0}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Max Shipping (USD)</label>
            <input
              type="number"
              value={maxShipping}
              onChange={(e) => setMaxShipping(parseFloat(e.target.value))}
              step={1}
              min={0}
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Competition Level</label>
            <select
              value={competitionLevel}
              onChange={(e) =>
                setCompetitionLevel(
                  e.target.value as "" | "low" | "medium" | "high"
                )
              }
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            >
              <option value="">Any</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
        )}

        <button
          onClick={handleSearch}
          disabled={searching}
          className="mt-4 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search Opportunities"}
        </button>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div>
          <p className="mb-4 text-sm text-gray-600">
            Found <strong>{results.length}</strong> matching opportunities
          </p>

          <div className="space-y-3">
            {results.map((opp) => (
              <div
                key={opp.productId}
                onClick={() => setSelectedOpportunity(opp)}
                className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                  selectedOpportunity?.productId === opp.productId
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{opp.productTitle}</h3>
                    <p className="text-sm text-gray-600">
                      Cost: ${opp.cost.toFixed(2)} | Retail: ${opp.estimatedRetailPrice.toFixed(2)} | Margin: {(opp.margin * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className={`rounded-lg border-2 ${scoreBg(opp.opportunityScore)} p-4 text-center`}>
                    <p className={`text-3xl font-bold ${scoreColor(opp.opportunityScore)}`}>
                      {opp.opportunityScore.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-600">Score</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {(opp.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : searching ? null : (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">No opportunities found. Adjust filters and search.</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedOpportunity && (
        <div className={`rounded-lg border-2 ${scoreBg(selectedOpportunity.opportunityScore)} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">{selectedOpportunity.productTitle}</h3>
            <button
              onClick={() => setSelectedOpportunity(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Score Breakdown */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded bg-white p-3">
              <p className="text-xs text-gray-600">Margin Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.marginScore)}`}>
                {selectedOpportunity.scoreBreakdown.marginScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded bg-white p-3">
              <p className="text-xs text-gray-600">Cost Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.costScore)}`}>
                {selectedOpportunity.scoreBreakdown.costScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded bg-white p-3">
              <p className="text-xs text-gray-600">Demand Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.demandScore)}`}>
                {selectedOpportunity.scoreBreakdown.demandScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded bg-white p-3">
              <p className="text-xs text-gray-600">Competition Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.competitionScore)}`}>
                {selectedOpportunity.scoreBreakdown.competitionScore.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            <div className="rounded bg-white p-4">
              <p className="text-sm text-gray-600">Cost</p>
              <p className="text-2xl font-bold">${selectedOpportunity.cost.toFixed(2)}</p>
            </div>
            <div className="rounded bg-white p-4">
              <p className="text-sm text-gray-600">Estimated Retail</p>
              <p className="text-2xl font-bold">
                ${selectedOpportunity.estimatedRetailPrice.toFixed(2)}
              </p>
            </div>
            <div className="rounded bg-white p-4">
              <p className="text-sm text-gray-600">Shipping Cost</p>
              <p className="text-2xl font-bold">${selectedOpportunity.shippingCost.toFixed(2)}</p>
            </div>
            <div className="rounded bg-white p-4">
              <p className="text-sm text-gray-600">Net Margin</p>
              <p className="text-2xl font-bold text-green-700">
                {(selectedOpportunity.margin * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Reasoning */}
          {selectedOpportunity.reasoning.length > 0 && (
            <div className="rounded bg-white p-4">
              <p className="mb-2 font-medium">Why This Opportunity</p>
              <ul className="space-y-1">
                {selectedOpportunity.reasoning.map((reason, i) => (
                  <li key={i} className="text-sm">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button className="flex-1 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">
              Add to Watchlist
            </button>
            <button className="flex-1 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Create Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
