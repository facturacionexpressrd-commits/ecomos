"use client";

import { useState } from "react";

interface ProductCopy {
  id: string;
  headline: string;
  description: string;
  bulletPoints: string[];
  seoKeywords: string[];
  confidence: number;
  isPublished: boolean;
}

interface ProductCopyEditorProps {
  storeId: string;
  productId: string;
  initialCopy?: ProductCopy;
  onPublish?: (copy: ProductCopy) => void;
  onGenerate?: () => void;
}

export default function ProductCopyEditor({
  storeId,
  productId,
  initialCopy,
  onPublish,
  onGenerate,
}: ProductCopyEditorProps) {
  const [copy, setCopy] = useState<ProductCopy | null>(initialCopy ?? null);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [editHeadline, setEditHeadline] = useState(initialCopy?.headline ?? "");
  const [editDescription, setEditDescription] = useState(
    initialCopy?.description ?? ""
  );

  const handleGenerate = async (targetAudience?: string) => {
    try {
      setGenerating(true);
      setError("");

      const response = await fetch("/api/ai/product-copy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          productId,
          targetAudience: targetAudience || "general customers",
          toneOfVoice: "professional yet engaging",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Generation failed");
      }

      const data = await response.json();
      setCopy(data.suggestion);
      setEditHeadline(data.suggestion.headline);
      setEditDescription(data.suggestion.description);

      if (onGenerate) onGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error generating copy");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (!copy) return;

    try {
      setPublishing(true);
      setError("");

      const response = await fetch("/api/ai/product-copy/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          copyId: copy.id,
          headline: editHeadline,
          description: editDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Publish failed");
      }

      const data = await response.json();
      setCopy(data.copy);

      if (onPublish) onPublish(data.copy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error publishing copy");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Generate Section */}
      {!copy ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
          <p className="mb-4 text-sm text-gray-600">
            AI will generate optimized product copy tailored to your audience
          </p>
          <button
            onClick={() => handleGenerate()}
            disabled={generating}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {generating ? "Generating..." : "Generate Product Copy"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Headline */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium">Headline</label>
              <span className="text-xs text-gray-500">
                Confidence: {(copy.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="text"
              value={editHeadline}
              onChange={(e) => setEditHeadline(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              maxLength={60}
            />
            <p className="mt-1 text-xs text-gray-500">
              {editHeadline.length}/60 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="h-40 w-full rounded border border-gray-300 px-3 py-2"
              placeholder="Edit product description..."
            />
          </div>

          {/* Bullet Points */}
          {copy.bulletPoints.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium">Bullet Points</label>
              <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                {copy.bulletPoints.map((point, i) => (
                  <p key={i} className="text-sm">
                    • {point}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* SEO Keywords */}
          {copy.seoKeywords.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium">SEO Keywords</label>
              <div className="flex flex-wrap gap-2">
                {copy.seoKeywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => handleGenerate()}
              disabled={generating || publishing || copy.isPublished}
              className="flex-1 rounded bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Regenerate"}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || copy.isPublished}
              className="flex-1 rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
            >
              {publishing ? "Publishing..." : copy.isPublished ? "Published" : "Publish to Shopify"}
            </button>
          </div>

          {copy.isPublished && (
            <p className="rounded bg-green-50 p-3 text-sm text-green-700">
              ✓ Published to Shopify at {new Date(copy.publishedAt!).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
