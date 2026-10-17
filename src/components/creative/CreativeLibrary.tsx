"use client";

import { useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface CreativeIdea {
  id: string;
  headlineText: string;
  headlineHook: string;
  headlineCta: string;
  imageConceptText: string;
  videoConceptText: string;
  targetAudience: string;
  emotionalApeals: string[];
  createdAt: string;
}

interface CreativeLibraryProps {
  storeId: string;
  productId: string;
  initialIdeas?: CreativeIdea[];
}

export default function CreativeLibrary({
  storeId,
  productId,
  initialIdeas = [],
}: CreativeLibraryProps) {
  const t = useT();
  const [ideas, setIdeas] = useState<CreativeIdea[]>(initialIdeas);
  const [generating, setGenerating] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<CreativeIdea | null>(null);
  const [targetAudience, setTargetAudience] = useState(t("creativeLib.defaultAudience"));

  const handleGenerateConcepts = async () => {
    try {
      setGenerating(true);
      setErrorKey(null);
      setErrorText("");

      const response = await fetch("/api/ai/creative/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId,
          targetAudience,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "");
      }

      const data = await response.json();
      setIdeas([...ideas, ...data.ideas]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "creativeLib.generateFailed");
      setErrorText(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Section */}
      <div className="rounded-lg border border-line bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold">{t("creativeLib.heading")}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">{t("creativeLib.audienceLabel")}</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder={t("creativeLib.audiencePlaceholder")}
              className="mt-1 w-full rounded border border-line-hi px-3 py-2"
            />
          </div>
          <button
            onClick={handleGenerateConcepts}
            disabled={generating}
            className="rounded bg-gold px-4 py-2 text-ink hover:bg-gold-hi disabled:opacity-50"
          >
            {generating ? t("creativeLib.generating") : t("creativeLib.generate")}
          </button>
          {(errorKey || errorText) && (
            <p className="rounded bg-coral/15 p-2 text-sm text-coral">
              {errorText || t(errorKey ?? "creativeLib.generateFailed")}
            </p>
          )}
        </div>
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-hi p-12 text-center">
          <p className="text-lo">{t("creativeLib.empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              onClick={() => setSelectedIdea(idea)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                selectedIdea?.id === idea.id
                  ? "border-gold bg-gold/10"
                  : "border-line hover:border-gold/50"
              }`}
            >
              <h4 className="mb-2 font-semibold">{idea.headlineText}</h4>
              <p className="text-sm text-lo">{idea.headlineHook}</p>
              <p className="mt-2 text-xs text-faint">{idea.targetAudience}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detail View */}
      {selectedIdea && (
        <div className="rounded-lg border border-line bg-white/5 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">{selectedIdea.headlineText}</h3>
            <button
              onClick={() => setSelectedIdea(null)}
              aria-label={t("creativeLib.closeDetail")}
              className="text-faint hover:text-hi"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Headline Details */}
            <div className="rounded bg-gold/10 p-4">
              <p className="mb-2 text-sm font-medium text-gold-hi">
                {t("creativeLib.headlineStrategy")}
              </p>
              <p className="text-sm">
                <strong>{t("creativeLib.hook")}</strong> {selectedIdea.headlineHook}
              </p>
              <p className="mt-1 text-sm">
                <strong>{t("creativeLib.ctaStyle")}</strong> {selectedIdea.headlineCta}
              </p>
            </div>

            {/* Visual Concepts */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border border-line p-4">
                <p className="mb-2 font-medium">{t("creativeLib.imageConcept")}</p>
                <p className="text-sm text-lo">{selectedIdea.imageConceptText}</p>
              </div>
              <div className="rounded border border-line p-4">
                <p className="mb-2 font-medium">{t("creativeLib.videoConcept")}</p>
                <p className="text-sm text-lo">{selectedIdea.videoConceptText}</p>
              </div>
            </div>

            {/* Emotional Appeals */}
            {selectedIdea.emotionalApeals.length > 0 && (
              <div>
                <p className="mb-2 font-medium">{t("creativeLib.emotionalAppeals")}</p>
                <div className="flex flex-wrap gap-2">
                  {selectedIdea.emotionalApeals.map((appeal, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-teal/15 px-3 py-1 text-sm text-teal"
                    >
                      {appeal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            <div className="rounded bg-white/5 p-4">
              <p className="text-sm font-medium">{t("creativeLib.targetAudience")}</p>
              <p className="mt-1 text-sm text-lo">{selectedIdea.targetAudience}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button className="flex-1 rounded bg-teal px-4 py-2 text-sm text-ink hover:opacity-90">
                {t("creativeLib.generateImage")}
              </button>
              <button className="flex-1 rounded bg-violet px-4 py-2 text-sm text-ink hover:opacity-90">
                {t("creativeLib.generateVideo")}
              </button>
              <button className="flex-1 rounded bg-white/10 px-4 py-2 text-sm hover:bg-white/15">
                {t("creativeLib.saveToCampaign")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
