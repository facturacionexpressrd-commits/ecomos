"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

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
  const t = useT();
  const [results, setResults] = useState<ScoredOpportunity[]>([]);
  const [searching, setSearching] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render;
  // `errorText` es el mensaje que ya viene traducido desde la API.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");
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
      setErrorKey(null);
      setErrorText("");

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
        const data = await response.json().catch(() => ({}));
        setErrorKey(data.error ? null : "research.searchFailed");
        setErrorText(data.error ?? "");
        return;
      }

      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "research.searchError");
      setErrorText(message);
    } finally {
      setSearching(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return "text-[#5d791c]";
    if (score >= 60) return "text-[#9a7412]";
    if (score >= 40) return "text-[#9a7412]";
    return "text-[#b64b3c]";
  };

  const scoreBg = (score: number) => {
    if (score >= 80) return "bg-[#f1f7e6] border-[#cfe39d]";
    if (score >= 60) return "bg-[#fff7df] border-[#f0db9f]";
    if (score >= 40) return "bg-[#fff7df] border-[#f0db9f]";
    return "bg-[#fff0ed] border-[#f2c2b9]";
  };

  return (
    <div className="space-y-5 text-[#171914]">
      {/* Search Filters */}
      <div className="rounded-2xl border border-[#e1e3dc] bg-white p-5 shadow-[0_2px_8px_rgba(25,30,15,.04)] sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">{t("research.searchHeading")}</h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm font-medium">{t("research.minMargin")}</label>
            <input
              type="number"
              value={minMargin * 100}
              onChange={(e) => setMinMargin(parseFloat(e.target.value) / 100)}
              step={5}
              min={0}
              max={100}
              className="mt-1 w-full rounded-xl border border-[#d9ddd2] bg-[#fbfcf9] px-3 py-2.5 text-sm text-[#171914] outline-none focus:border-[#9fc924] focus:ring-2 focus:ring-[#d8f76b]/40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t("research.maxCost")}</label>
            <input
              type="number"
              value={maxCost}
              onChange={(e) => setMaxCost(parseFloat(e.target.value))}
              step={5}
              min={0}
              className="mt-1 w-full rounded border border-[#d9ddd2] px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t("research.maxShipping")}</label>
            <input
              type="number"
              value={maxShipping}
              onChange={(e) => setMaxShipping(parseFloat(e.target.value))}
              step={1}
              min={0}
              className="mt-1 w-full rounded border border-[#e1e3dc]-hi px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">{t("research.competitionLevel")}</label>
            <select
              value={competitionLevel}
              onChange={(e) =>
                setCompetitionLevel(
                  e.target.value as "" | "low" | "medium" | "high"
                )
              }
              className="mt-1 w-full rounded border border-[#d9ddd2] px-3 py-2"
            >
              <option value="">{t("research.competitionAny")}</option>
              <option value="low">{t("research.competitionLow")}</option>
              <option value="medium">{t("research.competitionMedium")}</option>
              <option value="high">{t("research.competitionHigh")}</option>
            </select>
          </div>
        </div>

        {(errorKey || errorText) && (
          <p className="mt-4 rounded bg-[#fff0ed] p-2 text-sm text-[#b64b3c]">
            {errorText || t(errorKey ?? "research.searchError")}
          </p>
        )}

        <button
          onClick={handleSearch}
          disabled={searching}
          className="mt-4 rounded-xl bg-[#d8f76b] px-5 py-2.5 text-sm font-semibold text-[#171914] hover:bg-[#c7e653] disabled:cursor-wait disabled:opacity-60"
        >
          {searching ? t("research.searching") : t("research.search")}
        </button>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div>
          <p className="mb-4 text-sm text-[#6a6e64]">{t("research.found", { count: results.length })}</p>

          <div className="space-y-3">
            {results.map((opp) => (
              <div
                key={opp.productId}
                onClick={() => setSelectedOpportunity(opp)}
                className={`w-full cursor-pointer rounded-2xl border p-4 text-left shadow-[0_2px_8px_rgba(25,30,15,.04)] transition ${
                  selectedOpportunity?.productId === opp.productId
                    ? "border-[#d0e3a5] bg-[#d8f76b]/10"
                    : "border-[#e1e3dc] hover:border-[#9fc924]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{opp.productTitle}</h3>
                    <p className="text-sm text-[#6a6e64]">
                      {t("research.summary", {
                        cost: opp.cost.toFixed(2),
                        retail: opp.estimatedRetailPrice.toFixed(2),
                        margin: (opp.margin * 100).toFixed(0),
                      })}
                    </p>
                  </div>
                  <div className={`rounded-2xl border ${scoreBg(opp.opportunityScore)} p-4 text-center`}>
                    <p className={`text-3xl font-bold ${scoreColor(opp.opportunityScore)}`}>
                      {opp.opportunityScore.toFixed(0)}
                    </p>
                    <p className="text-xs text-[#6a6e64]">{t("research.score")}</p>
                    <p className="mt-1 text-xs text-[#85897e]">
                      {t("research.confidence", { value: (opp.confidence * 100).toFixed(0) })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : searching ? null : (
        <div className="rounded-lg border border-dashed border-[#d9ddd2] p-12 text-center">
          <p className="text-[#6a6e64]">{t("research.empty")}</p>
        </div>
      )}

      {/* Detail Panel */}
      {selectedOpportunity && (
        <div className={`rounded-2xl border ${scoreBg(selectedOpportunity.opportunityScore)} p-6`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">{selectedOpportunity.productTitle}</h3>
            <button
              onClick={() => setSelectedOpportunity(null)}
              aria-label={t("research.closeDetail")}
              className="text-[#85897e] hover:text-[#171914]"
            >
              ✕
            </button>
          </div>

          {/* Score Breakdown */}
          <div className="mb-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-[#f7f8f5] p-3">
              <p className="text-xs text-[#6a6e64]">{t("research.marginScore")}</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.marginScore)}`}>
                {selectedOpportunity.scoreBreakdown.marginScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-3">
              <p className="text-xs text-[#6a6e64]">{t("research.costScore")}</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.costScore)}`}>
                {selectedOpportunity.scoreBreakdown.costScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-3">
              <p className="text-xs text-[#6a6e64]">{t("research.demandScore")}</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.demandScore)}`}>
                {selectedOpportunity.scoreBreakdown.demandScore.toFixed(0)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-3">
              <p className="text-xs text-[#6a6e64]">{t("research.competitionScore")}</p>
              <p className={`text-2xl font-bold ${scoreColor(selectedOpportunity.scoreBreakdown.competitionScore)}`}>
                {selectedOpportunity.scoreBreakdown.competitionScore.toFixed(0)}
              </p>
            </div>
          </div>

          {/* Metrics */}
          <div className="mb-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl bg-[#f7f8f5] p-4">
              <p className="text-sm text-[#6a6e64]">{t("research.cost")}</p>
              <p className="text-2xl font-bold">${selectedOpportunity.cost.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-4">
              <p className="text-sm text-[#6a6e64]">{t("research.estimatedRetail")}</p>
              <p className="text-2xl font-bold">
                ${selectedOpportunity.estimatedRetailPrice.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-4">
              <p className="text-sm text-[#6a6e64]">{t("research.shippingCost")}</p>
              <p className="text-2xl font-bold">${selectedOpportunity.shippingCost.toFixed(2)}</p>
            </div>
            <div className="rounded-xl bg-[#f7f8f5] p-4">
              <p className="text-sm text-[#6a6e64]">{t("research.netMargin")}</p>
              <p className="text-2xl font-bold text-[#5d791c]">
                {(selectedOpportunity.margin * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Reasoning */}
          {selectedOpportunity.reasoning.length > 0 && (
            <div className="rounded-xl bg-[#f7f8f5] p-4">
              <p className="mb-2 font-medium">{t("research.why")}</p>
              <ul className="space-y-1">
                {selectedOpportunity.reasoning.map((reason, i) => (
                  <li key={i} className="text-sm">
                    • {reason}
                  </li>
                ))}
              </ul>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
