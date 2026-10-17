"use client";

import { useState } from "react";
import { useT, useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

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

const TYPE_KEYS: Record<Creative["type"], MessageKey> = {
  image: "creativeSelector.type.image",
  video: "creativeSelector.type.video",
};

export default function CreativeSelector({
  selectedCreativeIds,
  onSelectCreative,
  onUpload,
}: CreativeSelectorProps) {
  const t = useT();
  const locale = useLocale();
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorKey(null);
      setErrorText("");

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
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "");
      }

      const data = await res.json();
      setCreatives([...creatives, data.creative]);
      setShowUpload(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "creativeSelector.uploadFailed");
      setErrorText(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">{t("creativeSelector.heading")}</h4>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="rounded bg-gold/10 px-3 py-1 text-sm text-gold-hi hover:bg-gold/20"
        >
          {t("creativeSelector.upload")}
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
          {(errorKey || errorText) && (
            <p className="mt-2 text-sm text-coral">
              {errorText || t(errorKey ?? "creativeSelector.uploadFailed")}
            </p>
          )}
          {uploading && <p className="mt-2 text-sm text-lo">{t("creativeSelector.uploading")}</p>}
        </div>
      )}

      {creatives.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-hi p-6 text-center">
          <p className="text-sm text-lo">{t("creativeSelector.empty")}</p>
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
                  {t(TYPE_KEYS[creative.type] ?? "creativeSelector.type.image")} •{" "}
                  {new Date(creative.uploadedAt).toLocaleDateString(locale)}
                </p>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
