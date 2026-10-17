"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n";

interface Offer {
  id: string;
  name: string;
  cost: number;
  margin: number;
  url: string;
}

interface OfferSelectorProps {
  storeId: string;
  productId: string;
  selectedOfferId?: string;
  onSelect: (offerId: string, offer: Offer) => void;
}

export default function OfferSelector({
  storeId,
  productId,
  selectedOfferId,
  onSelect,
}: OfferSelectorProps) {
  const t = useT();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  // Se guarda la clave del error, no el texto, para que el efecto no dependa de `t`.
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/offers?storeId=${encodeURIComponent(storeId)}&productId=${encodeURIComponent(productId)}`
        );
        if (!res.ok) throw new Error("");
        const data = await res.json();
        setOffers(data.offers || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        setErrorKey(message ? null : "offerSelector.loadFailed");
        setErrorText(message);
      } finally {
        setLoading(false);
      }
    };
    loadOffers();
  }, [storeId, productId]);

  if (loading) return <div className="text-lo">{t("offerSelector.loading")}</div>;
  if (errorKey || errorText)
    return (
      <div className="text-coral">
        {t("offerSelector.error", {
          message: errorText || t(errorKey ?? "offerSelector.loadFailed"),
        })}
      </div>
    );

  if (offers.length === 0) {
    return (
      <div className="rounded bg-gold/15 p-3 text-center text-sm text-gold-hi">
        {t("offerSelector.empty")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {offers.map((offer) => (
        <button
          key={offer.id}
          onClick={() => onSelect(offer.id, offer)}
          className={`w-full rounded border-2 p-3 text-left transition ${
            selectedOfferId === offer.id
              ? "border-teal bg-teal/15"
              : "border-line hover:border-teal/50"
          }`}
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{offer.name}</p>
              <p className="text-xs text-faint">{offer.url}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {t("offerSelector.cost", { value: offer.cost.toFixed(2) })}
              </p>
              <p className="text-xs text-teal">
                {t("offerSelector.margin", { value: (offer.margin * 100).toFixed(0) })}
              </p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
