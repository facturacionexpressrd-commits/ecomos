"use client";

import { useState } from "react";

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

export default function CampaignReview({
  campaignData,
  onBack,
  onPublish,
  loading,
  error,
}: CampaignReviewProps) {
  const [approved, setApproved] = useState(false);

  const objectiveLabels: Record<string, string> = {
    LINK_CLICKS: "Link Clicks",
    CONVERSIONS: "Conversions",
    REACH: "Reach",
    IMPRESSIONS: "Impressions",
    VIDEO_VIEWS: "Video Views",
  };

  const marketLabels: Record<string, string> = {
    us: "United States",
    ca: "Canada",
    uk: "United Kingdom",
    au: "Australia",
    global: "Global",
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Review Campaign</h1>
        <p className="mt-2 text-lo">
          Please review your campaign configuration below. Once published, you can edit the campaign in Meta Ads
          Manager.
        </p>
      </div>

      {/* Configuration Summary */}
      <div className="rounded-lg border border-line bg-white/5 p-6 space-y-6">
        {/* Campaign Basics */}
        <div>
          <h2 className="text-lg font-semibold">Campaign Details</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">Campaign Name</span>
              <span className="font-medium">{campaignData.name}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">Objective</span>
              <span className="font-medium">{objectiveLabels[campaignData.objective]}</span>
            </div>
          </div>
        </div>

        {/* Targeting */}
        <div>
          <h2 className="text-lg font-semibold">Targeting & Audience</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">Primary Market</span>
              <span className="font-medium">{marketLabels[campaignData.market]}</span>
            </div>
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">Age Range</span>
              <span className="font-medium">
                {campaignData.ageMin} – {campaignData.ageMax}
              </span>
            </div>
            <div className="rounded bg-gold/10 p-3 text-xs text-gold-hi mt-3">
              More detailed targeting (interests, behaviors, placements) can be configured in Meta Ads Manager
              after campaign creation.
            </div>
          </div>
        </div>

        {/* Budget */}
        <div>
          <h2 className="text-lg font-semibold">Budget</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between border-b border-line pb-3">
              <span className="text-lo">Daily Budget</span>
              <span className="font-medium">${campaignData.budget.toFixed(2)} USD</span>
            </div>
            <div className="rounded bg-gold/15 p-3 text-xs text-gold-hi mt-3">
              <p>
                <strong>Important:</strong> The campaign will be created in PAUSED status. You&apos;ll need to:
              </p>
              <ul className="mt-2 space-y-1 ml-4 list-disc">
                <li>Set up ad sets (audience targeting, placements)</li>
                <li>Upload creative (images, videos, copy)</li>
                <li>Activate the campaign to start spending</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Warnings */}
        <div className="rounded-lg border-l-4 border-gold bg-gold/15 p-4">
          <p className="text-sm font-semibold text-gold-hi">⚠ Before You Publish</p>
          <ul className="mt-2 space-y-1 text-sm text-gold-hi ml-4 list-disc">
            <li>You&apos;ll manage creatives and ad sets directly in Meta Ads Manager (read-only in EcomOS for now)</li>
            <li>Campaign status can be edited in EcomOS (pause, activate, duplicate)</li>
            <li>Budget changes must be made in Meta Ads Manager</li>
            <li>This campaign cannot be edited or deleted via EcomOS once created</li>
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
              I confirm that I&apos;ve reviewed the campaign details and understand that:
              <ul className="mt-2 space-y-1 ml-4 list-disc text-xs text-lo">
                <li>The campaign will be created in a PAUSED state</li>
                <li>I must activate it in EcomOS or Meta Ads Manager to start spending</li>
                <li>Meta will begin charging according to the daily budget once activated</li>
                <li>I&apos;m responsible for accurate campaign setup and compliance</li>
              </ul>
            </span>
          </label>
        </div>

        {error && (
          <div className="rounded bg-coral/15 p-3 text-sm text-coral">
            <strong>Error:</strong> {error}
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
          ← Back to Setup
        </button>
        <button
          onClick={onPublish}
          disabled={!approved || loading}
          className="rounded bg-teal px-4 py-2 font-medium text-ink hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Publishing..." : "✓ Publish Campaign"}
        </button>
      </div>

      {/* Success Message Area */}
      {loading && (
        <div className="mt-4 rounded bg-gold/10 p-3 text-sm text-gold-hi">
          Creating campaign in Meta Ads Manager... This may take a few seconds.
        </div>
      )}
    </div>
  );
}
