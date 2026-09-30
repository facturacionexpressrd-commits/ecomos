"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteProductButton({
  storeId,
  productId,
  productTitle,
}: {
  storeId: string;
  productId: string;
  productTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onDelete = async () => {
    if (
      !window.confirm(
        `Delete "${productTitle}" from EcomOS? Variants, inventory, supplier links, AI copy and creative ideas are removed. Order history is kept. If the product still exists in Shopify it will resync on the next run — delete it in Shopify first for a permanent removal.`
      )
    ) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/products/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, productId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Delete failed: ${res.statusText}`);
      }
      router.push(`/dashboard/products?store=${storeId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
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
        {loading ? "Deleting…" : "🗑 Delete product"}
      </button>
      {error && <span className="text-xs text-coral">{error}</span>}
    </div>
  );
}
