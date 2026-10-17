"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface Product {
  id: string;
  title: string;
  shopifyGid: string;
}

interface ProductSelectorProps {
  storeId: string;
  selectedProductId?: string;
  onSelect: (productId: string, product: Product) => void;
}

export default function ProductSelector({
  storeId,
  selectedProductId,
  onSelect,
}: ProductSelectorProps) {
  const t = useT();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  // Se guarda la clave del error, no el texto, para que el efecto no dependa de `t`.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/products/list?storeId=${encodeURIComponent(storeId)}&limit=100`
        );
        if (!res.ok) throw new Error("");
        const data = await res.json();
        setProducts(data.products || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setErrorKey(message ? null : "productSelector.loadFailed");
        setErrorText(message);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [storeId]);

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="text-lo">{t("productSelector.loading")}</div>;
  if (errorKey || errorText)
    return (
      <div className="text-coral">
        {t("productSelector.error", {
          message: errorText || t(errorKey ?? "productSelector.loadFailed"),
        })}
      </div>
    );

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium">{t("productSelector.searchLabel")}</label>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("productSelector.searchPlaceholder")}
          className="mt-1 w-full rounded border border-line-hi px-3 py-2"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded bg-white/5 p-3 text-center text-sm text-lo">
          {products.length === 0 ? t("productSelector.none") : t("productSelector.noMatches")}
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.map((product) => (
            <button
              key={product.id}
              onClick={() => onSelect(product.id, product)}
              className={`w-full rounded border-2 p-3 text-left transition ${
                selectedProductId === product.id
                  ? "border-gold bg-gold/10"
                  : "border-line hover:border-gold/50"
              }`}
            >
              <p className="font-medium">{product.title}</p>
              <p className="text-xs text-faint">{product.shopifyGid}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
