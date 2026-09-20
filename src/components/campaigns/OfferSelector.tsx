"use client";

import { useEffect, useState } from "react";

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
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOffers = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/offers?storeId=${encodeURIComponent(storeId)}&productId=${encodeURIComponent(productId)}`
        );
        if (!res.ok) throw new Error("Failed to load offers");
        const data = await res.json();
        setOffers(data.offers || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading offers");
      } finally {
        setLoading(false);
      }
    };
    loadOffers();
  }, [storeId, productId]);

  if (loading) return <div className="text-gray-600">Loading offers...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  if (offers.length === 0) {
    return (
      <div className="rounded bg-yellow-50 p-3 text-center text-sm text-yellow-700">
        No offers found for this product. Create one in your sourcing tool.
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
              ? "border-green-600 bg-green-50"
              : "border-gray-200 hover:border-green-300"
          }`}
        >
          <div className="flex justify-between">
            <div>
              <p className="font-medium">{offer.name}</p>
              <p className="text-xs text-gray-500">{offer.url}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Cost: ${offer.cost.toFixed(2)}</p>
              <p className="text-xs text-green-600">Margin: {(offer.margin * 100).toFixed(0)}%</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
