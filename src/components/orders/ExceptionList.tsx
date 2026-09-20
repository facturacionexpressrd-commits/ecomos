"use client";

import { useState } from "react";

interface Exception {
  id: string;
  supplierOrderId: string;
  orderShopifyGid: string;
  supplier: string;
  type: string;
  severity: string;
  description: string;
  recommendedAction: string | null;
  isResolved: boolean;
  createdAt: Date;
  userId: string | null;
}

interface ExceptionListProps {
  exceptions: Exception[];
  storeId: string;
}

export default function ExceptionList({ exceptions, storeId }: ExceptionListProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [action, setAction] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (exceptionId: string, isResolving: boolean) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/exceptions/${exceptionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          isResolved: isResolving,
          recommendedAction: action || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");
      setEditing(null);
      setAction("");
      window.location.reload();
    } catch (err) {
      console.error("Update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const severityColor: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="space-y-4">
      {exceptions.map((exc) => (
        <div key={exc.id} className="rounded-lg border border-gray-200 p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="font-semibold">Order #{exc.orderShopifyGid?.slice(-8)}</p>
                <span className="text-sm text-gray-600">{exc.supplier}</span>
              </div>
              <p className="text-sm text-gray-600">{exc.type}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-3 py-1 text-xs font-semibold ${severityColor[exc.severity] || severityColor.medium}`}>
                {exc.severity}
              </span>
              <span className={`rounded px-3 py-1 text-xs font-semibold ${exc.isResolved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                {exc.isResolved ? "Resolved" : "Open"}
              </span>
            </div>
          </div>

          <p className="mb-4 text-sm text-gray-700">{exc.description}</p>

          {editing === exc.id ? (
            <div className="mb-4 space-y-2">
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Enter recommended action..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(exc.id, true)}
                  disabled={loading}
                  className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Resolve
                </button>
                <button
                  onClick={() => {
                    setEditing(null);
                    setAction("");
                  }}
                  className="rounded bg-gray-200 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {exc.recommendedAction && (
                <div className="rounded-md bg-blue-50 p-3">
                  <p className="text-xs font-semibold text-blue-700">Recommended Action</p>
                  <p className="text-sm text-blue-700">{exc.recommendedAction}</p>
                </div>
              )}

              {!exc.isResolved && (
                <button
                  onClick={() => {
                    setEditing(exc.id);
                    setAction(exc.recommendedAction || "");
                  }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Add action & resolve
                </button>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500">Opened {new Date(exc.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
