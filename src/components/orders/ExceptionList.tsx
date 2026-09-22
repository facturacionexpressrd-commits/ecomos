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
    critical: "bg-coral/15 text-coral",
    high: "bg-gold/15 text-gold-hi",
    medium: "bg-gold/15 text-gold-hi",
    low: "bg-gold/10 text-gold-hi",
  };

  return (
    <div className="space-y-4">
      {exceptions.map((exc) => (
        <div key={exc.id} className="rounded-lg border border-line p-6">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="font-semibold">Order #{exc.orderShopifyGid?.slice(-8)}</p>
                <span className="text-sm text-lo">{exc.supplier}</span>
              </div>
              <p className="text-sm text-lo">{exc.type}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-3 py-1 text-xs font-semibold ${severityColor[exc.severity] || severityColor.medium}`}>
                {exc.severity}
              </span>
              <span className={`rounded px-3 py-1 text-xs font-semibold ${exc.isResolved ? "bg-teal/15 text-teal" : "bg-white/5 text-lo"}`}>
                {exc.isResolved ? "Resolved" : "Open"}
              </span>
            </div>
          </div>

          <p className="mb-4 text-sm text-lo">{exc.description}</p>

          {editing === exc.id ? (
            <div className="mb-4 space-y-2">
              <textarea
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Enter recommended action..."
                className="w-full rounded border border-line-hi px-3 py-2 text-sm focus:border-gold/50 focus:outline-none"
                rows={3}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdate(exc.id, true)}
                  disabled={loading}
                  className="rounded bg-teal px-3 py-1 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-50"
                >
                  Resolve
                </button>
                <button
                  onClick={() => {
                    setEditing(null);
                    setAction("");
                  }}
                  className="rounded bg-white/10 px-3 py-1 text-sm font-medium text-lo hover:bg-white/15"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {exc.recommendedAction && (
                <div className="rounded-md bg-gold/10 p-3">
                  <p className="text-xs font-semibold text-gold-hi">Recommended Action</p>
                  <p className="text-sm text-gold-hi">{exc.recommendedAction}</p>
                </div>
              )}

              {!exc.isResolved && (
                <button
                  onClick={() => {
                    setEditing(exc.id);
                    setAction(exc.recommendedAction || "");
                  }}
                  className="text-sm text-gold-hi hover:underline"
                >
                  Add action & resolve
                </button>
              )}
            </div>
          )}

          <p className="mt-3 text-xs text-faint">Opened {new Date(exc.createdAt).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}
