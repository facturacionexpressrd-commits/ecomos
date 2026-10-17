"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey, T } from "@/lib/i18n";

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
}

// Los enums de Meta llegan crudos desde la base de datos: se traducen por tabla
// y, si aparece uno nuevo, se muestra el valor crudo en vez de dejarlo vacío.
const BILLING_EVENT_KEYS: Record<string, MessageKey> = {
  CLICKS: "billingEvent.CLICKS",
  IMPRESSIONS: "billingEvent.IMPRESSIONS",
  CONVERSIONS: "billingEvent.CONVERSIONS",
};

const OPTIMIZATION_GOAL_KEYS: Record<string, MessageKey> = {
  LINK_CLICKS: "objective.LINK_CLICKS",
  CONVERSIONS: "objective.CONVERSIONS",
  REACH: "objective.REACH",
};

const STATUS_KEYS: Record<string, MessageKey> = {
  ACTIVE: "campaignStatus.ACTIVE",
  PAUSED: "campaignStatus.PAUSED",
};

const label = (t: T, table: Record<string, MessageKey>, value: string) => {
  const key = table[value];
  return key ? t(key) : value;
};

export default function AdSetManager({
  storeId,
  metaCampaignId,
  adSets,
}: AdSetManagerProps) {
  const t = useT();
  const router = useRouter();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    billing_event: "CLICKS",
    optimization_goal: "LINK_CLICKS",
    daily_budget: "1",
  });
  const [loading, setLoading] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");

  const handleCreate = async () => {
    try {
      setLoading(true);
      setErrorKey(null);
      setErrorText("");

      if (!formData.name.trim()) {
        setErrorKey("adSets.nameRequired");
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
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "");
      }

      setShowCreateForm(false);
      setFormData({ name: "", billing_event: "CLICKS", optimization_goal: "LINK_CLICKS", daily_budget: "1" });
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "adSets.createFailed");
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("adSets.heading", { count: adSets.length })}
        </h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="rounded bg-teal px-3 py-1 text-sm font-medium text-ink hover:opacity-90"
        >
          {t("adSets.new")}
        </button>
      </div>

      {showCreateForm && (
        <div className="rounded-lg border border-line bg-white/5 p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">{t("adSets.nameLabel")}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t("adSets.namePlaceholder")}
              className="mt-1 w-full rounded border border-line-hi px-3 py-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium">{t("adSets.billingEvent")}</label>
              <select
                value={formData.billing_event}
                onChange={(e) => setFormData({ ...formData, billing_event: e.target.value })}
                className="mt-1 w-full rounded border border-line-hi px-3 py-2"
              >
                <option value="CLICKS">{t("billingEvent.CLICKS")}</option>
                <option value="IMPRESSIONS">{t("billingEvent.IMPRESSIONS")}</option>
                <option value="CONVERSIONS">{t("billingEvent.CONVERSIONS")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">{t("adSets.optimizationGoal")}</label>
              <select
                value={formData.optimization_goal}
                onChange={(e) => setFormData({ ...formData, optimization_goal: e.target.value })}
                className="mt-1 w-full rounded border border-line-hi px-3 py-2"
              >
                <option value="LINK_CLICKS">{t("objective.LINK_CLICKS")}</option>
                <option value="CONVERSIONS">{t("objective.CONVERSIONS")}</option>
                <option value="REACH">{t("objective.REACH")}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">{t("adSets.dailyBudget")}</label>
            <div className="mt-1 flex items-center">
              <span className="text-lg font-medium">$</span>
              <input
                type="number"
                value={formData.daily_budget}
                onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
                min="0.01"
                step="0.01"
                className="ml-2 flex-1 rounded border border-line-hi px-3 py-2"
              />
            </div>
          </div>

          {(errorKey || errorText) && (
            <div className="rounded bg-coral/15 p-2 text-sm text-coral">
              {errorText || t(errorKey ?? "adSets.createFailed")}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              disabled={loading}
              className="flex-1 rounded bg-white/10 px-3 py-2 font-medium hover:bg-white/15 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !formData.name}
              className="flex-1 rounded bg-teal px-3 py-2 font-medium text-ink hover:opacity-90 disabled:opacity-50"
            >
              {loading ? t("adSets.creating") : t("adSets.create")}
            </button>
          </div>
        </div>
      )}

      {adSets.length === 0 ? (
        <div className="rounded-lg border border-line bg-white/5 p-6 text-center">
          <p className="text-lo">{t("adSets.empty")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {adSets.map((adSet) => (
            <div key={adSet.id} className="flex items-center justify-between rounded-lg border border-line p-4">
              <div>
                <p className="font-medium">{adSet.name}</p>
                <p className="text-xs text-lo">
                  {t("adSets.summary", {
                    billing: label(t, BILLING_EVENT_KEYS, adSet.billingEvent),
                    goal: label(t, OPTIMIZATION_GOAL_KEYS, adSet.optimizationGoal),
                    count: adSet.creatives.length,
                  })}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                    adSet.status === "ACTIVE"
                      ? "bg-teal/15 text-teal"
                      : "bg-gold/15 text-gold-hi"
                  }`}
                >
                  {label(t, STATUS_KEYS, adSet.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
