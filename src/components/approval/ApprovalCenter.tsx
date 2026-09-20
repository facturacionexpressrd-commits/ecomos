"use client";

import { useEffect, useState } from "react";

interface ApprovalActionItem {
  id: string;
  actionType: string;
  title: string;
  description: string;
  priority: string;
  confidenceScore: number;
  reasoning: string;
  executiveExplanation: string;
  status: string;
  createdAt: string;
}

interface ApprovalCenterProps {
  storeId: string;
}

export default function ApprovalCenter({ storeId }: ApprovalCenterProps) {
  const [approvals, setApprovals] = useState<ApprovalActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedApproval, setSelectedApproval] = useState<ApprovalActionItem | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    loadApprovals();
  }, [storeId]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/approvals/list?storeId=${encodeURIComponent(storeId)}&status=pending`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to load approvals");
      }

      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: "approved" | "rejected") => {
    if (!selectedApproval) return;
    if (decision === "rejected" && !rejectionReason.trim()) {
      setError("Rejection reason required");
      return;
    }

    try {
      setDeciding(true);
      setError("");

      const response = await fetch("/api/approvals/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          approvalId: selectedApproval.id,
          decision,
          rejectionReason: decision === "rejected" ? rejectionReason : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Decision failed");
      }

      // Remove from list and deselect
      setApprovals(approvals.filter((a) => a.id !== selectedApproval.id));
      setSelectedApproval(null);
      setRejectionReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error deciding");
    } finally {
      setDeciding(false);
    }
  };

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const actionTypeIcon = (actionType: string) => {
    switch (actionType) {
      case "supplier_add":
        return "🤝";
      case "budget_update":
        return "💰";
      case "price_adjustment":
        return "💵";
      case "creative_approval":
        return "🎨";
      case "campaign_launch":
        return "🚀";
      case "product_publish":
        return "📦";
      case "order_fulfillment":
        return "📦";
      default:
        return "✓";
    }
  };

  if (loading) {
    return <div className="text-center text-gray-600">Loading approvals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Approval Center</h2>
        <p className="mt-1 text-gray-600">
          {approvals.length} action{approvals.length !== 1 ? "s" : ""} awaiting approval
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {approvals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-gray-600">No pending approvals. Everything is up to date!</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Approvals List */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {approvals.map((approval) => (
                <button
                  key={approval.id}
                  onClick={() => setSelectedApproval(approval)}
                  className={`w-full rounded-lg border-2 p-4 text-left transition ${
                    selectedApproval?.id === approval.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{actionTypeIcon(approval.actionType)}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{approval.title}</p>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {approval.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`rounded border px-2 py-1 text-xs font-medium ${priorityColor(
                            approval.priority
                          )}`}
                        >
                          {approval.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(approval.confidenceScore * 100).toFixed(0)}% confident
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail Panel */}
          {selectedApproval && (
            <div className="rounded-lg border-2 border-blue-600 bg-blue-50 p-6 lg:col-span-2">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-4xl">{actionTypeIcon(selectedApproval.actionType)}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{selectedApproval.title}</h3>
                    <p className="text-sm text-gray-600">{selectedApproval.actionType}</p>
                  </div>
                </div>
              </div>

              {/* Executive Explanation */}
              <div className="mb-6 rounded-lg bg-white p-4 border-l-4 border-blue-500">
                <p className="text-sm font-medium text-gray-700 mb-2">Executive Summary</p>
                <p className="text-base leading-relaxed">
                  {selectedApproval.executiveExplanation}
                </p>
              </div>

              {/* Details */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded bg-white p-4">
                  <p className="text-sm text-gray-600">Priority</p>
                  <p className={`mt-1 inline-block rounded px-3 py-1 text-sm font-medium ${priorityColor(
                    selectedApproval.priority
                  )}`}>
                    {selectedApproval.priority.toUpperCase()}
                  </p>
                </div>
                <div className="rounded bg-white p-4">
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p className="mt-1 text-2xl font-bold text-blue-600">
                    {(selectedApproval.confidenceScore * 100).toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* Reasoning */}
              <div className="mb-6 rounded bg-white p-4">
                <p className="mb-2 text-sm font-medium">AI Reasoning</p>
                <p className="text-sm text-gray-700">{selectedApproval.reasoning}</p>
              </div>

              {/* Decision Section */}
              {selectedApproval.status === "pending" && (
                <div className="space-y-4 border-t pt-6">
                  {selectedApproval.priority === "critical" && (
                    <div className="rounded bg-red-50 p-4 text-sm text-red-700">
                      ⚠️ This is a critical action requiring immediate attention
                    </div>
                  )}

                  {rejectionReason && (
                    <div>
                      <label className="block text-sm font-medium">Rejection Reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="mt-2 h-20 w-full rounded border border-gray-300 px-3 py-2"
                        placeholder="Why are you rejecting this action?"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecision("approved")}
                      disabled={deciding}
                      className="flex-1 rounded bg-green-600 px-4 py-3 text-white hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {deciding ? "Processing..." : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => {
                        if (rejectionReason) {
                          handleDecision("rejected");
                        } else {
                          setRejectionReason("Pending");
                        }
                      }}
                      disabled={deciding}
                      className="flex-1 rounded bg-red-600 px-4 py-3 text-white hover:bg-red-700 disabled:opacity-50 font-medium"
                    >
                      {rejectionReason ? "✗ Confirm Reject" : "✗ Reject"}
                    </button>
                  </div>
                </div>
              )}

              {selectedApproval.status !== "pending" && (
                <div className="rounded bg-gray-100 p-4 text-center text-sm text-gray-600">
                  Status: <span className="font-medium capitalize">{selectedApproval.status}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
