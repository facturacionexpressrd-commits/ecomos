"use client";

import { useState } from "react";

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
  const [ideas, setIdeas] = useState<CreativeIdea[]>(initialIdeas);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<CreativeIdea | null>(null);
  const [targetAudience, setTargetAudience] = useState("general customers");

  const handleGenerateConcepts = async () => {
    try {
      setGenerating(true);
      setError("");

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
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      setIdeas([...ideas, ...data.ideas]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating concepts");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Section */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="mb-4 text-lg font-semibold">Generate Creative Concepts</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Target Audience</label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g., busy professionals, eco-conscious buyers"
              className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <button
            onClick={handleGenerateConcepts}
            disabled={generating}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate 3 Concepts"}
          </button>
          {error && (
            <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
          )}
        </div>
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-600">
            No creative concepts yet. Generate some to get started!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              onClick={() => setSelectedIdea(idea)}
              className={`cursor-pointer rounded-lg border-2 p-4 transition ${
                selectedIdea?.id === idea.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-blue-300"
              }`}
            >
              <h4 className="mb-2 font-semibold">{idea.headlineText}</h4>
              <p className="text-sm text-gray-600">{idea.headlineHook}</p>
              <p className="mt-2 text-xs text-gray-500">{idea.targetAudience}</p>
            </div>
          ))}
        </div>
      )}

      {/* Detail View */}
      {selectedIdea && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold">{selectedIdea.headlineText}</h3>
            <button
              onClick={() => setSelectedIdea(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Headline Details */}
            <div className="rounded bg-blue-50 p-4">
              <p className="mb-2 text-sm font-medium text-blue-900">Headline Strategy</p>
              <p className="text-sm">
                <strong>Hook:</strong> {selectedIdea.headlineHook}
              </p>
              <p className="mt-1 text-sm">
                <strong>CTA Style:</strong> {selectedIdea.headlineCta}
              </p>
            </div>

            {/* Visual Concepts */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded border border-gray-200 p-4">
                <p className="mb-2 font-medium">Image Concept</p>
                <p className="text-sm text-gray-700">{selectedIdea.imageConceptText}</p>
              </div>
              <div className="rounded border border-gray-200 p-4">
                <p className="mb-2 font-medium">Video Concept</p>
                <p className="text-sm text-gray-700">{selectedIdea.videoConceptText}</p>
              </div>
            </div>

            {/* Emotional Appeals */}
            {selectedIdea.emotionalApeals.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Emotional Appeals</p>
                <div className="flex flex-wrap gap-2">
                  {selectedIdea.emotionalApeals.map((appeal, i) => (
                    <span
                      key={i}
                      className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700"
                    >
                      {appeal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Target Audience */}
            <div className="rounded bg-gray-50 p-4">
              <p className="text-sm font-medium">Target Audience</p>
              <p className="mt-1 text-sm text-gray-700">{selectedIdea.targetAudience}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <button className="flex-1 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                Generate Image
              </button>
              <button className="flex-1 rounded bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700">
                Generate Video
              </button>
              <button className="flex-1 rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300">
                Save to Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
