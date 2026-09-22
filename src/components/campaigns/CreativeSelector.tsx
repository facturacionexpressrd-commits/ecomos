"use client";

import { useState } from "react";

interface Creative {
  id: string;
  name: string;
  type: "image" | "video";
  url: string;
  uploadedAt: string;
}

interface CreativeSelectorProps {
  selectedCreativeIds: string[];
  onSelectCreative: (creativeId: string, checked: boolean) => void;
  onUpload?: (file: File) => Promise<void>;
}

export default function CreativeSelector({
  selectedCreativeIds,
  onSelectCreative,
  onUpload,
}: CreativeSelectorProps) {
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError("");

      if (onUpload) {
        await onUpload(file);
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/creatives/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setCreatives([...creatives, data.creative]);
      setShowUpload(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Creatives</h4>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded bg-gold/10 px-3 py-1 text-sm text-gold-hi hover:bg-gold/20"
        >
          + Upload Creative
        </button>
      </div>

      {showUpload && (
        <div className="rounded-lg border border-line bg-white/5 p-4">
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm"
          />
          {error && <p className="mt-2 text-sm text-coral">{error}</p>}
          {uploading && <p className="mt-2 text-sm text-lo">Uploading...</p>}
        </div>
      )}

      {creatives.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-hi p-6 text-center">
          <p className="text-sm text-lo">No creatives yet. Upload images or videos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creatives.map((creative) => (
            <label
              key={creative.id}
              className="flex items-center gap-3 rounded-lg border border-line p-3 hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={selectedCreativeIds.includes(creative.id)}
                onChange={(e) => onSelectCreative(creative.id, e.target.checked)}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium">{creative.name}</p>
                <p className="text-xs text-faint">
                  {creative.type} • {new Date(creative.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
