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
    if (score >= 80) return "text-teal";
    if (score >= 60) return "text-gold-hi";
    if (score >= 40) return "text-gold-hi";
    return "text-coral";
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "bg-teal/15 border-teal/30";
    if (score >= 60) return "bg-gold/10 border-gold/40";
    if (score >= 40) return "bg-gold/15 border-gold/30";
    return "bg-coral/15 border-coral/30";
  };

  return (
    <div className="space-y-6">
      {/* Search Filters */}
      <div className="rounded-lg border border-line bg-white/5 p-6">
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
              className="mt-1 w-full rounded border border-line-hi px-3 py-2"
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
              className="mt-1 w-full rounded border border-line-hi px-3 py-2"
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
              className="mt-1 w-full rounded border border-line-hi px-3 py-2"
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
              className="mt-1 w-full rounded border border-line-hi px-3 py-2"
            >
              <option value="">Any</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded bg-coral/15 p-2 text-sm text-coral">{error}</p>
        )}

        <button
          onClick={handleSearch}
          disabled={searching}
          className="mt-4 rounded bg-gold px-6 py-2 text-ink hover:bg-gold-hi disabled:opacity-50"
        >
          {searching ? "Searching..." : "Search Opportunities"}
        </button>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div>
          <p className="mb-4 text-sm text-lo">
            Found <strong>{results.length}</strong> matching opportunities
          </p>

          <div className="space-y-3">
            {results.map((opp) => (
              <div
                key={opp.productId}
                onClick={() => setSelectedOpportunity(opp)}
                className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                  selectedOpportunity?.productId === opp.productId
                    ? "border-gold bg-gold/10"
                    : "border-line hover:border-gold/50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{opp.productTitle}</h3>
                    <p className="text-sm text-lo">
                      Cost: ${opp.cost.toFixed(2)} | Retail: ${opp.estimatedRetailPrice.toFixed(2)} | Margin: {(opp.margin * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className={`rounded-lg border-2 ${scoreBg(opp.opportunityScore)} p-4 text-center`}>
                    <p className={`text-3xl font-bold ${scoreColor(opp.opportunityScore)}`}>
                      {opp.opportunityScore.toFixed(0)}
                    </p>
                    <p className="text-xs text-lo">Score</p>
                    <p className="mt-1 text-xs text-faint">
                      {(opp.confidence * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : searching ? null : (
        <div className="rounded-lg border border-dashed border-line-hi p-12 text-center">
          <p className="text-lo">No opportunities found. Adjust filters and search.</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedOpportunity && (
        <div className={`rounded-lg border-2 ${scoreBg(selectedOpportunity.opportunityScore)} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">{selectedOpportunity.productTitle}</h3>
            <button
              onClick={() => setSelectedOpportunity(null)}
              className="text-faint hover:text-hi"
            >
              ✕
            </button>
          </div>

          {/* Score Breakdown */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded bg-white/5 p-3">
              <p className="text-xs text-lo">Margin Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.marginScore)}`}>
                {selectedOpportunity.scoreBreakdown.marginScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded bg-white/5 p-3">
              <p className="text-xs text-lo">Cost Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.costScore)}`}>
                {selectedOpportunity.scoreBreakdown.costScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded bg-white/5 p-3">
              <p className="text-xs text-lo">Demand Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.demandScore)}`}>
                {selectedOpportunity.scoreBreakdown.demandScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded bg-white/5 p-3">
              <p className="text-xs text-lo">Competition Score</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.competitionScore)}`}>
                {selectedOpportunity.scoreBreakdown.competitionScore.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            <div className="rounded bg-white/5 p-4">
              <p className="text-sm text-lo">Cost</p>
              <p className="text-2xl font-bold">${selectedOpportunity.cost.toFixed(2)}</p>
            </div>
            <div className="rounded bg-white/5 p-4">
              <p className="text-sm text-lo">Estimated Retail</p>
              <p className="text-2xl font-bold">
                ${selectedOpportunity.estimatedRetailPrice.toFixed(2)}
              </p>
            </div>
            <div className="rounded bg-white/5 p-4">
              <p className="text-sm text-lo">Shipping Cost</p>
              <p className="text-2xl font-bold">${selectedOpportunity.shippingCost.toFixed(2)}</p>
            </div>
            <div className="rounded bg-white/5 p-4">
              <p className="text-sm text-lo">Net Margin</p>
              <p className="text-2xl font-bold text-teal">
                {(selectedOpportunity.margin * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Reasoning */}
          {selectedOpportunity.reasoning.length > 0 && (
            <div className="rounded bg-white/5 p-4">
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
            <button className="flex-1 rounded bg-teal px-4 py-2 text-ink hover:opacity-90">
              Add to Watchlist
            </button>
            <button className="flex-1 rounded bg-gold px-4 py-2 text-ink hover:bg-gold-hi">
              Create Campaign
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
