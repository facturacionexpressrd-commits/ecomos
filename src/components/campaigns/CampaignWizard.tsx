"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CampaignReview from "./CampaignReview";

interface CampaignWizardProps {
  storeId: string;
}

export default function CampaignWizard({ storeId }: CampaignWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReview, setShowReview] = useState(false);

  const [campaignData, setCampaignData] = useState({
    name: "",
    objective: "LINK_CLICKS",
    budget: 100, // daily budget in dollars
    market: "us",
    ageMin: 18,
    ageMax: 65,
    interests: [] as string[],
  });

  const objectives = [
    { value: "LINK_CLICKS", label: "Link Clicks" },
    { value: "CONVERSIONS", label: "Conversions" },
    { value: "REACH", label: "Reach" },
    { value: "IMPRESSIONS", label: "Impressions" },
    { value: "VIDEO_VIEWS", label: "Video Views" },
  ];

  const handleNext = () => {
    if (step === 1 && !campaignData.name.trim()) {
      setError("Campaign name is required");
      return;
    }
    if (step === 4) {
      // Before review, validate budget
      if (campaignData.budget < 1) {
        setError("Daily budget must be at least $1");
        return;
      }
      setShowReview(true);
      return;
    }
    setError("");
    setStep(step + 1);
  };

  const handlePrevious = () => {
    setError("");
    setShowReview(false);
    setStep(Math.max(1, step - 1));
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/meta/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          campaignData: {
            name: campaignData.name,
            objective: campaignData.objective,
            budget: Math.round(campaignData.budget * 100), // convert to cents
          },
          reviewApproved: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create campaign");
      }

      const result = await response.json();
      router.push(`/dashboard/meta/campaigns?success=true&campaignId=${result.campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setLoading(false);
    }
  };

  if (showReview) {
    return (
      <CampaignReview
        storeId={storeId}
        campaignData={campaignData}
        onBack={handlePrevious}
        onPublish={handleCreate}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                  s <= step ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div className={`h-1 w-12 ${s < step ? "bg-blue-600" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-sm text-gray-600">
          <span>Campaign Details</span>
          <span>Objective</span>
          <span>Targeting</span>
          <span>Budget</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Campaign Details</h2>
            <div>
              <label className="block text-sm font-medium">Campaign Name</label>
              <input
                type="text"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                placeholder="E.g., Summer Sale 2024"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-gray-500">{campaignData.name.length}/100</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Campaign Objective</h2>
            <div>
              <label className="block text-sm font-medium">What's your goal?</label>
              <div className="mt-3 space-y-2">
                {objectives.map((obj) => (
                  <label key={obj.value} className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="objective"
                      value={obj.value}
                      checked={campaignData.objective === obj.value}
                      onChange={(e) =>
                        setCampaignData({ ...campaignData, objective: e.target.value })
                      }
                      className="rounded border-gray-300"
                    />
                    <span className="ml-3 text-sm">{obj.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Targeting & Audience</h2>
            <div>
              <label className="block text-sm font-medium">Primary Market</label>
              <select
                value={campaignData.market}
                onChange={(e) => setCampaignData({ ...campaignData, market: e.target.value })}
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
              >
                <option value="us">United States</option>
                <option value="ca">Canada</option>
                <option value="uk">United Kingdom</option>
                <option value="au">Australia</option>
                <option value="global">Global</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Min Age</label>
                <input
                  type="number"
                  value={campaignData.ageMin}
                  onChange={(e) =>
                    setCampaignData({ ...campaignData, ageMin: parseInt(e.target.value) })
                  }
                  min={13}
                  max={65}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Max Age</label>
                <input
                  type="number"
                  value={campaignData.ageMax}
                  onChange={(e) =>
                    setCampaignData({ ...campaignData, ageMax: parseInt(e.target.value) })
                  }
                  min={13}
                  max={65}
                  className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600">
              Full audience targeting (interests, behaviors, placements) will be configured in Meta Ads Manager
              after campaign creation.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Budget & Schedule</h2>
            <div>
              <label className="block text-sm font-medium">Daily Budget (USD)</label>
              <div className="mt-1 flex items-center">
                <span className="text-lg font-medium">$</span>
                <input
                  type="number"
                  value={campaignData.budget}
                  onChange={(e) =>
                    setCampaignData({ ...campaignData, budget: parseFloat(e.target.value) })
                  }
                  min={1}
                  step={1}
                  className="ml-2 flex-1 rounded border border-gray-300 px-3 py-2"
                />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                Minimum daily budget is $1 USD. You can change this anytime.
              </p>
            </div>
            <div className="rounded bg-blue-50 p-3 text-sm text-blue-800">
              <p>
                <strong>Campaign will start PAUSED.</strong> After review, you'll be able to edit ad sets,
                upload creatives, and then activate.
              </p>
            </div>
          </div>
        )}

        {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={step === 1 || loading}
          className="rounded bg-gray-200 px-4 py-2 font-medium hover:bg-gray-300 disabled:opacity-50"
        >
          ← Previous
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {step === 4 ? "Review & Publish →" : "Next →"}
        </button>
      </div>
    </div>
  );
}
