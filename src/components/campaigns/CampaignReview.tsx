"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface CampaignReviewProps {
  storeId: string;
  campaignData: {
    name: string;
    objective: string;
    budget: number;
    market: string;
    ageMin: number;
    ageMax: number;
    interests: string[];
  };
  onBack: () => void;
  onPublish: () => Promise<void>;
  loading: boolean;
  error: string;
}

const OBJECTIVE_KEYS: Record<string, MessageKey> = {
  LINK_CLICKS: "objective.LINK_CLICKS",
  CONVERSIONS: "objective.CONVERSIONS",
  REACH: "objective.REACH",
  IMPRESSIONS: "objective.IMPRESSIONS",
  VIDEO_VIEWS: "objective.VIDEO_VIEWS",
};

const MARKET_KEYS: Record<string, MessageKey> = {
  us: "market.us",
  ca: "market.ca",
  uk: "market.uk",
  au: "market.au",
  global: "market.global",
};

export default function CampaignReview({
  campaignData,
  onBack,
  onPublish,
  loading,
  error,
}: CampaignReviewProps) {
  const t = useT();
  const [approved, setApproved] = useState(false);

  // Si Meta añade un objetivo o mercado nuevo, se muestra el valor crudo.
  const objectiveKey = OBJECTIVE_KEYS[campaignData.objective];
  const marketKey = MARKET_KEYS[campaignData.market];

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t("review.title")}</h1>
        <p className="mt-2 text-lo">{t("review.intro")}</p>
      </div>

      {/* Configuration Summary */}
      <div className="rounded-lg border border-line bg-white/5 p-6 space-y-6">
        {/* Campaign Basics */}
        <div>
          <h2 className="text-lg font-semibold">{t("review.detailsHeading")}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">{t("review.name")}</span>
              <span className="font-medium">{campaignData.name}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">{t("review.objective")}</span>
              <span className="font-medium">
                {objectiveKey ? t(objectiveKey) : campaignData.objective}
              </span>
            </div>
          </div>
        </div>

        {/* Targeting */}
        <div>
          <h2 className="text-lg font-semibold">{t("review.targetingHeading")}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">{t("review.market")}</span>
              <span className="font-medium">
                {marketKey ? t(marketKey) : campaignData.market}
              </span>
            </div>
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">{t("review.ageRange")}</span>
              <span className="font-medium">
                {t("review.ageValue", { min: campaignData.ageMin, max: campaignData.ageMax })}
              </span>
            </div>
            <div className="rounded bg-gold/10 p-3 text-xs text-gold-hi mt-3">
              {t("review.targetingNote")}
            </div>
          </div>
        </div>

        {/* Budget */}
        <div>
          <h2 className="text-lg font-semibold">{t("review.budgetHeading")}</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">{t("review.dailyBudget")}</span>
              <span className="font-medium">
                {t("review.budgetValue", { value: campaignData.budget.toFixed(2) })}
              </span>
            </div>
            <div className="rounded bg-gold/15 p-3 text-xs text-gold-hi mt-3">
              <p>
                <strong>{t("review.importantLabel")}</strong> {t("review.importantBody")}
              </p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>{t("review.todo1")}</li>
                <li>{t("review.todo2")}</li>
                <li>{t("review.todo3")}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Warnings */}
        <div className="rounded-lg border-l-4 border-gold bg-gold/15 p-4">
          <p className="text-sm font-semibold text-gold-hi">{t("review.beforePublish")}</p>
          <ul className="mt-2 space-y-1 text-sm text-gold-hi ml-4 list-disc">
            <li>{t("review.warn1")}</li>
            <li>{t("review.warn2")}</li>
            <li>{t("review.warn3")}</li>
            <li>{t("review.warn4")}</li>
          </ul>
        </div>

        {/* Approval Checkbox */}
        <div className="rounded-lg border border-line bg-white/5 p-4">
          <label className="flex cursor-pointer items-start">
            <input
              type="checkbox"
              checked={approved}
              onChange={(e) => setApproved(e.target.checked)}
              className="mt-1 rounded border-line-hi"
            />
            <span className="ml-3 text-sm">
              {t("review.confirmIntro")}
              <ul className="mt-2 space-y-1 ml-4 list-disc text-xs text-lo">
                <li>{t("review.confirm1")}</li>
                <li>{t("review.confirm2")}</li>
                <li>{t("review.confirm3")}</li>
                <li>{t("review.confirm4")}</li>
              </ul>
            </span>
          </label>
        </div>

        {error && (
          <div className="rounded bg-coral/15 p-3 text-sm text-coral">
            <strong>{t("review.errorLabel")}</strong> {error}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          disabled={loading}
          className="rounded bg-white/10 px-4 py-2 font-medium hover:bg-white/15 disabled:opacity-50"
        >
          {t("review.back")}
        </button>
        <button
          onClick={onPublish}
          disabled={!approved || loading}
          className="rounded bg-teal px-4 py-2 font-medium text-ink hover:opacity-90 disabled:opacity-50"
        >
          {loading ? t("review.publishing") : t("review.publish")}
        </button>
      </div>

      {/* Success Message Area */}
      {loading && (
        <div className="mt-4 rounded bg-gold/10 p-3 text-sm text-gold-hi">
          {t("review.creating")}
        </div>
      )}
    </div>
  );
}
