"use client";

import { useEffect, useState } from "react";
import { SupplierName } from "@prisma/client";

interface SupplierOffer {
  supplier: SupplierName;
  cost: number;
  shippingCost: number;
  shippingDays: number;
  availableQty: number;
  syncStatus?: string;
  lastSyncedAt?: string;
}

interface SupplierComparisonProps {
  canonicalProductId: string;
  storeId: string;
}

const SUPPLIERS: Array<{ name: SupplierName; label: string }> = [
  { name: "autods", label: "AutoDS" },
  { name: "spocket", label: "Spocket" },
  { name: "printful", label: "Printful" },
  { name: "zendrop", label: "Zendrop" },
];

const CONNECTED_SUPPLIER = "autods";

export default function SupplierComparison({
  canonicalProductId,
  storeId,
}: SupplierComparisonProps) {
  const [offers, setOffers] = useState<Record<SupplierName, SupplierOffer | null>>({
    autods: null,
    spocket: null,
    printful: null,
    zendrop: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const sync = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/canonical-products/sync-offers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canonicalProductId, storeId }),
        });

        if (!res.ok) throw new Error("Failed to sync offers");

        const data = await res.json();
        const offerMap: Record<SupplierName, SupplierOffer | null> = {
          autods: null,
          spocket: null,
          printful: null,
          zendrop: null,
        };

        for (const offer of data.offers) {
          offerMap[offer.supplier as SupplierName] = offer;
        }

        setOffers(offerMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    sync();
  }, [canonicalProductId, storeId]);

  if (loading) return <div className="p-4 text-gray-600">Syncing supplier offers...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <section className="rounded-lg border border-gray-200 p-8">
      <h2 className="mb-6 text-xl font-semibold">Supplier Comparison</h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-2 text-left font-medium">Supplier</th>
              <th className="px-4 py-2 text-right font-medium">Cost</th>
              <th className="px-4 py-2 text-right font-medium">Shipping</th>
              <th className="px-4 py-2 text-right font-medium">Delivery Days</th>
              <th className="px-4 py-2 text-right font-medium">Available Qty</th>
              <th className="px-4 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLIERS.map((supplier) => {
              const offer = offers[supplier.name as SupplierName];
              const isConnected = supplier.name === CONNECTED_SUPPLIER;

              return (
                <tr key={supplier.name} className="border-b border-gray-100">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{supplier.label}</p>
                      {!isConnected && (
                        <p className="text-xs text-gray-500">not connected</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {offer && offer.syncStatus === "success" ? (
                      <p className="font-semibold">${offer.cost.toFixed(2)}</p>
                    ) : (
                      <p className="text-gray-400">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {offer && offer.syncStatus === "success" ? (
                      <p>${offer.shippingCost.toFixed(2)}</p>
                    ) : (
                      <p className="text-gray-400">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {offer && offer.syncStatus === "success" ? (
                      <p>{offer.shippingDays} days</p>
                    ) : (
                      <p className="text-gray-400">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {offer && offer.syncStatus === "success" ? (
                      <p>{offer.availableQty} units</p>
                    ) : (
                      <p className="text-gray-400">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {!isConnected ? (
                      <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">
                        Disconnected
                      </span>
                    ) : offer?.syncStatus === "success" ? (
                      <span className="rounded bg-green-100 px-2 py-1 text-xs text-green-700">
                        Live
                      </span>
                    ) : offer?.syncStatus === "not_found" ? (
                      <span className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                        Not found
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-gray-500">
        Last synced: {offers.autods?.lastSyncedAt ? new Date(offers.autods.lastSyncedAt).toLocaleString() : "—"}
      </p>
    </section>
  );
}
