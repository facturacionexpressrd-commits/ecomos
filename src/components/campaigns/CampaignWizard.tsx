"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CampaignReview from "./CampaignReview";
import ProductSelector from "./ProductSelector";
import OfferSelector from "./OfferSelector";
import CreativeSelector from "./CreativeSelector";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface CampaignWizardProps {
  storeId: string;
}

const OBJECTIVES: { value: string; key: MessageKey }[] = [
  { value: "LINK_CLICKS", key: "objective.LINK_CLICKS" },
  { value: "CONVERSIONS", key: "objective.CONVERSIONS" },
  { value: "REACH", key: "objective.REACH" },
  { value: "IMPRESSIONS", key: "objective.IMPRESSIONS" },
  { value: "VIDEO_VIEWS", key: "objective.VIDEO_VIEWS" },
];

const MARKETS: { value: string; key: MessageKey }[] = [
  { value: "us", key: "market.us" },
  { value: "ca", key: "market.ca" },
  { value: "uk", key: "market.uk" },
  { value: "au", key: "market.au" },
  { value: "global", key: "market.global" },
];

export default function CampaignWizard({ storeId }: CampaignWizardProps) {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render;
  // `errorText` es el mensaje que ya viene traducido desde la API.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");
  const [showReview, setShowReview] = useState(false);

  const [campaignData, setCampaignData] = useState({
    name: "",
    productId: "",
    offerId: "",
    creativeIds: [] as string[],
    objective: "LINK_CLICKS",
    budget: 100, // daily budget in dollars
    market: "us",
    ageMin: 18,
    ageMax: 65,
    interests: [] as string[],
  });

  const fail = (key: MessageKey) => {
    setErrorKey(key);
    setErrorText("");
  };

  const clearError = () => {
    setErrorKey(null);
    setErrorText("");
  };

  const handleNext = () => {
    if (step === 1 && !campaignData.name.trim()) {
      fail("wizard.err.name");
      return;
    }
    if (step === 1 && !campaignData.productId) {
      fail("wizard.err.product");
      return;
    }
    if (step === 2 && !campaignData.offerId) {
      fail("wizard.err.offer");
      return;
    }
    if (step === 2 && campaignData.creativeIds.length === 0) {
      fail("wizard.err.creative");
      return;
    }
    if (step === 5) {
      // Before review, validate budget
      if (campaignData.budget < 1) {
        fail("wizard.err.budget");
        return;
      }
      setShowReview(true);
      return;
    }
    clearError();
    setStep(step + 1);
  };

  const handlePrevious = () => {
    clearError();
    setShowReview(false);
    setStep(Math.max(1, step - 1));
  };

  const handleCreate = async () => {
    try {
      setLoading(true);
      clearError();

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
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "");
      }

      const result = await response.json();
      router.push(`/dashboard/meta/campaigns?success=true&campaignId=${result.campaign.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "wizard.err.createFailed");
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  const errorMessage =
    errorKey || errorText ? errorText || t(errorKey ?? "wizard.err.createFailed") : "";

  if (showReview) {
    return (
      <CampaignReview
        storeId={storeId}
        campaignData={campaignData}
        onBack={handlePrevious}
        onPublish={handleCreate}
        loading={loading}
        error={errorMessage}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                  s <= step ? "bg-gold text-ink" : "bg-white/10 text-lo"
                }`}
              >
                {s}
              </div>
              {s < 5 && (
                <div className={`h-1 w-12 ${s < step ? "bg-gold" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-lo">
          <span>{t("wizard.step.details")}</span>
          <span>{t("wizard.step.product")}</span>
          <span>{t("wizard.step.creative")}</span>
          <span>{t("wizard.step.objective")}</span>
          <span>{t("wizard.step.budget")}</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="rounded-lg border border-line bg-white/5 p-6">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">{t("wizard.detailsHeading")}</h2>
              <label className="block text-sm font-medium">{t("wizard.nameLabel")}</label>
              <input
                type="text"
                value={campaignData.name}
                onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                placeholder={t("wizard.namePlaceholder")}
                className="mt-1 w-full rounded border border-line-hi px-3 py-2"
                maxLength={100}
              />
              <p className="mt-1 text-xs text-faint">
                {t("wizard.nameCount", { count: campaignData.name.length })}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-3">{t("wizard.productLabel")}</label>
              <ProductSelector
                storeId={storeId}
                selectedProductId={campaignData.productId}
                onSelect={(productId) =>
                  setCampaignData({ ...campaignData, productId })
                }
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-4">{t("wizard.offerHeading")}</h2>
              <label className="block text-sm font-medium mb-3">{t("wizard.offerLabel")}</label>
              {campaignData.productId ? (
                <OfferSelector
                  storeId={storeId}
                  productId={campaignData.productId}
                  selectedOfferId={campaignData.offerId}
                  onSelect={(offerId) =>
                    setCampaignData({ ...campaignData, offerId })
                  }
                />
              ) : (
                <p className="text-sm text-gold-hi">{t("wizard.selectProductFirst")}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-3">{t("wizard.creativeLabel")}</label>
              <CreativeSelector
                selectedCreativeIds={campaignData.creativeIds}
                onSelectCreative={(id, checked) => {
                  if (checked) {
                    setCampaignData({
                      ...campaignData,
                      creativeIds: [...campaignData.creativeIds, id],
                    });
                  } else {
                    setCampaignData({
                      ...campaignData,
                      creativeIds: campaignData.creativeIds.filter((cid) => cid !== id),
                    });
                  }
                }}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("wizard.objectiveHeading")}</h2>
            <div>
              <label className="block text-sm font-medium">{t("wizard.goalLabel")}</label>
              <div className="mt-3 space-y-2">
                {OBJECTIVES.map((obj) => (
                  <label key={obj.value} className="flex cursor-pointer items-center">
                    <input
                      type="radio"
                      name="objective"
                      value={obj.value}
                      checked={campaignData.objective === obj.value}
                      onChange={(e) =>
                        setCampaignData({ ...campaignData, objective: e.target.value })
                      }
                      className="rounded border-line-hi"
                    />
                    <span className="ml-3 text-sm">{t(obj.key)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("wizard.targetingHeading")}</h2>
            <div>
              <label className="block text-sm font-medium">{t("wizard.marketLabel")}</label>
              <select
                value={campaignData.market}
                onChange={(e) => setCampaignData({ ...campaignData, market: e.target.value })}
                className="mt-1 w-full rounded border border-line-hi px-3 py-2"
              >
                {MARKETS.map((market) => (
                  <option key={market.value} value={market.value}>
                    {t(market.key)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">{t("wizard.ageMin")}</label>
                <input
                  type="number"
                  value={campaignData.ageMin}
                  onChange={(e) =>
                    setCampaignData({ ...campaignData, ageMin: parseInt(e.target.value) })
                  }
                  min={13}
                  max={65}
                  className="mt-1 w-full rounded border border-line-hi px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">{t("wizard.ageMax")}</label>
                <input
                  type="number"
                  value={campaignData.ageMax}
                  onChange={(e) =>
                    setCampaignData({ ...campaignData, ageMax: parseInt(e.target.value) })
                  }
                  min={13}
                  max={65}
                  className="mt-1 w-full rounded border border-line-hi px-3 py-2"
                />
              </div>
            </div>
            <p className="text-xs text-lo">{t("wizard.targetingNote")}</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">{t("wizard.budgetHeading")}</h2>
            <div>
              <label className="block text-sm font-medium">{t("wizard.budgetLabel")}</label>
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
                  className="ml-2 flex-1 rounded border border-line-hi px-3 py-2"
                />
              </div>
              <p className="mt-2 text-xs text-lo">{t("wizard.budgetHint")}</p>
            </div>
            <div className="rounded bg-gold/10 p-3 text-sm text-gold-hi">
              <p>
                <strong>{t("wizard.pausedNoticeStrong")}</strong> {t("wizard.pausedNotice")}
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="rounded bg-coral/15 p-3 text-sm text-coral">{errorMessage}</div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={step === 1 || loading}
          className="rounded bg-white/10 px-4 py-2 font-medium hover:bg-white/15 disabled:opacity-50"
        >
          {t("wizard.previous")}
        </button>
        <button
          onClick={handleNext}
          disabled={loading}
          className="rounded bg-gold px-4 py-2 font-medium text-ink hover:bg-gold-hi disabled:opacity-50"
        >
          {step === 5 ? t("wizard.reviewPublish") : t("wizard.next")}
        </button>
      </div>
    </div>
  );
}
