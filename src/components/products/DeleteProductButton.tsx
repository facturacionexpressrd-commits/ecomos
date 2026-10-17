"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

export default function DeleteProductButton({
  storeId,
  productId,
  productTitle,
}: {
  storeId: string;
  productId: string;
  productTitle: string;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Se guarda la clave del error, no el texto, para traducirlo en el render.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");

  const onDelete = async () => {
    if (!window.confirm(t("deleteProduct.confirm", { title: productTitle }))) {
      return;
    }
    setLoading(true);
    setErrorKey(null);
    setErrorText("");
    try {
      const res = await fetch("/api/products/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, productId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorText(
          data.error || t("deleteProduct.failedStatus", { status: res.statusText })
        );
        setLoading(false);
        return;
      }
      router.push(`/dashboard/products?store=${storeId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setErrorKey(message ? null : "deleteProduct.failed");
      setErrorText(message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={onDelete}
        disabled={loading}
        className="rounded-lg border border-line-hi bg-white/5 px-3 py-1.5 text-xs font-medium text-coral hover:bg-white/10 disabled:opacity-50"
      >
        {loading ? t("deleteProduct.deleting") : t("deleteProduct.button")}
      </button>
      {(errorKey || errorText) && (
        <span className="text-xs text-coral">
          {errorText || t(errorKey ?? "deleteProduct.failed")}
        </span>
      )}
    </div>
  );
}
